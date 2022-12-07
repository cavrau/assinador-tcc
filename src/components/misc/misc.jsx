import * as pkijs from 'pkijs'

import * as asn1js from 'asn1js'
import { sign, addPlaceholder, calculate_content_bytes } from "./sign"
import axios from 'axios';
var forge = require('node-forge');

async function assinar(pdf_bytes, filename) {
    // var startTime = performance.now()
    pdf_bytes = new Buffer(pdf_bytes)
    // Cria objeto de assinatura dentro do PDF com uma assinatura placeholder
    pdf_bytes = await addPlaceholder(
        pdf_bytes
    );
    // Calcula o hash do documento pegando os bytes em volta da assinatura
    const hash_value = await calculate_content_bytes(pdf_bytes)
    // Gera par de chaves
    const keys = await window.crypto.subtle.generateKey({
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-384",
        modulusLength: 4096,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01])
    },
        true,
        ["sign", "verify"]
    )
    // cria um CSR
    const pkcs10 = new pkijs.CertificationRequest();
    // insere nome no CSR
    pkcs10.subject.typesAndValues.push(new pkijs.AttributeTypeAndValue({
        type: "2.5.4.3",
        value: new asn1js.Utf8String({ value: `Username` })
    }));
    // Importa a chave publica no csr
    await pkcs10.subjectPublicKeyInfo.importKey(keys.publicKey);

    pkcs10.attributes = [];
    // bota atributo do OTS no CSR
    pkcs10.attributes.push(new pkijs.Attribute({
        type: "1.2.840.113549.1.9.14", // pkcs-9-at-extensionRequest
        values: [(new pkijs.Extensions({
            extensions: [
                new pkijs.Extension({
                    extnID: "2.16.508.1.1.1.1", // id-ce-subjectAltName
                    critical: false,
                    extnValue: (new asn1js.Utf8String({ value: `sha384:${hash_value}` })).toBER(false)
                }),
            ]
        })).toSchema()]
    }));

    // Assina o CSR com a chave privada
    await pkcs10.sign(keys.privateKey, "SHA-384");
    // Converte o CSR para b64 e coloca dentro de um arquivo
    const pkcs10Raw = pkcs10.toSchema(true).toBER();
    const csr_contents = window.btoa(String.fromCharCode(...new Uint8Array(pkcs10Raw)));
    const csr_file = `-----BEGIN CERTIFICATE REQUEST-----\n${csr_contents}\n-----END CERTIFICATE REQUEST-----`
    const csr = new File([csr_file], "test.csr")
    const form = new FormData();
    form.append('csr', csr, 'file.pdf');
    // envia o CSR e recebe um PKCS7
    const res = await axios.post(
        "http://kubernetes.docker.internal:5004/pki/p7b/sign",
        form,
        {
            headers: {
                //   ...form.getHeaders(),
                // Authentication: 'Bearer token',
                "Access-Control-Allow-Origin": "*"
            },
        }
    )
    // Lê PKCS7
    const pkcs7 = forge.pkcs7.messageFromPem(res.data)
    // exporta a chave privada gerada no começo para pkcs8 e bota ela num arquivo
    const exported = await window.crypto.subtle.exportKey("pkcs8", keys.privateKey)
    const exportedAsString = ab2str(exported);
    const exportedAsBase64 = window.btoa(exportedAsString);
    const pemExported = `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64}\n-----END PRIVATE KEY-----`;
    // lê chave privada de um arquivo
    const privateKey = forge.pki.privateKeyFromPem(pemExported);
    // Cria um pkcs12 com a chave privada e os certificados do pkcs7 recebido
    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(privateKey, pkcs7.certificates, '');

    // Lê pkcs12
    var pkcs12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, "");
    // Assina o PDF
    pdf_bytes = sign(
        pdf_bytes,
        pkcs12,
    );
    // faz o download do pdf
    const link = document.createElement('a');
    const new_filename = filename.replace(".pdf", "assinado.pdf")
    const blob = new Blob([pdf_bytes]);
    // Browsers that support HTML5 download attribute
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', new_filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    // var endTime = performance.now()x)

}
export default assinar;


function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}
