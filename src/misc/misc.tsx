import * as pkijs from "pkijs";

import * as asn1js from "asn1js";
import { sign, calculate_content_bytes, addPlaceholder } from "./sign";
import { signOut } from "next-auth/react";
import axios from "axios";
var forge = require("node-forge");

export class AuthException extends Error {}

async function assinar(
  pdf_bytes: ArrayBuffer,
  filename: string,
  name: string,
  email: string
) {
  const start = Date.now();

  // var startTime = performance.now()
  const parsed_pdf_bytes = new Buffer(pdf_bytes);
  // Cria objeto de assinatura dentro do PDF com uma assinatura placeholder
  const placeholder_pdf_bytes = await addPlaceholder(parsed_pdf_bytes);

  const place_holder_end = Date.now();
  console.log(`Placeholder time: ${place_holder_end - start} ms`);
  // const _link = document.createElement('a');
  // const _new_filename = filename.replace(".pdf", "_cru.pdf").replace(" ", "_")
  // const _blob = new Blob([placeholder_pdf_bytes]);
  // // Browsers that support HTML5 download attribute
  // if (_link.download !== undefined) {
  //     const _url = URL.createObjectURL(_blob);
  //     _link.setAttribute('href', _url);
  //     _link.setAttribute('download', _new_filename);
  //     _link.style.visibility = 'hidden';
  //     document.body.appendChild(_link);
  //     _link.click();
  //     document.body.removeChild(_link);
  // }

  // Calcula o hash do documento pegando os bytes em volta da assinatura
  const hash_value = await calculate_content_bytes(placeholder_pdf_bytes);

  const hash_time = Date.now();
  console.log(`Hash time: ${hash_time - place_holder_end} ms`);
  // Gera par de chaves
  const keys = await window.crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-384",
      modulusLength: 4096,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
    },
    true,
    ["sign", "verify"]
  );

  const key_creation = Date.now();
  console.log(`Key creation time: ${key_creation - hash_time} ms`);
  // cria um CSR
  const pkcs10 = new pkijs.CertificationRequest();
  // insere nome no CSR
  pkcs10.subject.typesAndValues.push(
    new pkijs.AttributeTypeAndValue({
      type: "2.5.4.3",
      value: new asn1js.Utf8String({ value: name }),
    })
  );
  // Importa a chave publica no csr
  await pkcs10.subjectPublicKeyInfo.importKey(keys.publicKey);

  pkcs10.attributes = [];
  // bota atributo do OTS no CSR
  pkcs10.attributes.push(
    new pkijs.Attribute({
      type: "1.2.840.113549.1.9.14", // pkcs-9-at-extensionRequest
      values: [
        new pkijs.Extensions({
          extensions: [
            new pkijs.Extension({
              extnID: "1.3.6.1.4.1.15996.1.1.6.2.1", // id-ce-subjectAltName
              critical: false,
              extnValue: new asn1js.Utf8String({
                value: `sha384:${hash_value}`,
              }).toBER(false),
            }),
          ],
        }).toSchema(),
      ],
    })
  );

  // Assina o CSR com a chave privada
  await pkcs10.sign(keys.privateKey, "SHA-384");
  // Converte o CSR para b64 e coloca dentro de um arquivo
  const pkcs10Raw = pkcs10.toSchema(true).toBER();
  const csr_contents = window.btoa(
    String.fromCharCode(...new Uint8Array(pkcs10Raw))
  );
  const csr_file = `-----BEGIN CERTIFICATE REQUEST-----\n${csr_contents}\n-----END CERTIFICATE REQUEST-----`;
  const csr = new File([csr_file], "test.csr");
  const form = new FormData();
  form.append("csr", csr, "file.csr");

  const csr_end = Date.now();
  console.log(`CSR ready to send time: ${csr_end - key_creation} ms`);
  // envia o CSR e recebe um PKCS7
  let res
  try {
      res = await axios.post("/api/assinar", form, {
        headers: {
          //   ...form.getHeaders(),
          // Authentication: 'Bearer token',
          "Access-Control-Allow-Origin": "*",
        },
      });
    
  } catch (error: any) {
      if (error.response.status === 401) {
        // console.log("AUTH EXCEPTION")
        throw new AuthException("Auth Exception");
      }
      throw error
}
  const cert_Response = Date.now();
  console.log(`Cert_Response time: ${cert_Response - csr_end} ms`);
  // Lê PKCS7
  const pkcs7 = forge.pkcs7.messageFromPem(res.data);
  // exporta a chave privada gerada no começo para pkcs8 e bota ela num arquivo
  const exported = await window.crypto.subtle.exportKey(
    "pkcs8",
    keys.privateKey
  );
  const exportedAsString = ab2str(exported);
  const exportedAsBase64 = window.btoa(exportedAsString);
  const pemExported = `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64}\n-----END PRIVATE KEY-----`;
  // lê chave privada de um arquivo
  const privateKey = forge.pki.privateKeyFromPem(pemExported);
  // Cria um pkcs12 com a chave privada e os certificados do pkcs7 recebido
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(privateKey, pkcs7.certificates, "");

  // Lê pkcs12
  var pkcs12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, "");

  const pkcs7_topcks12 = Date.now();
  console.log(`pkcs prep time: ${pkcs7_topcks12 - cert_Response} ms`);
  // Assina o PDF
  const signed_pdf_bytes = sign(placeholder_pdf_bytes, pkcs12);

  const signed = Date.now();
  console.log(`Signed time: ${signed - pkcs7_topcks12} ms`);
  // faz o download do pdf
  const link = document.createElement("a");
  const new_filename = filename
    .replace(".pdf", "_assinado.pdf")
    .replace(" ", "_");
  const blob = new Blob([signed_pdf_bytes]);
  // Browsers that support HTML5 download attribute
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", new_filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  const end = Date.now();
  console.log(`download time: ${end - signed} ms`);
  console.log(`Execution time: ${end - start} ms`);
  // var endTime = performance.now()x)
}
export default assinar;

function ab2str(buf: ArrayBuffer) {
  return String.fromCharCode.apply(null, Array.from(new Uint8Array(buf)));
}
