import * as pkijs from 'pkijs'

import * as asn1js from 'asn1js'
// import forge from 'node-forge'
import {sign, addPlaceholder} from "./sign"
// import { plainAddPlaceholder} from 'node-signpdf'
import axios from 'axios';
var forge = require('node-forge');
console.log(forge.pkcs7)
async function hash(bytes){
  console.log(
    window.btoa(String.fromCharCode(...new Uint8Array(await window.crypto.subtle.digest("SHA-256",bytes))))

  )
}
async function assinar(pdf_instance, filename) {
  let pdf_bytes = await pdf_instance.exportPDF()
  hash(pdf_bytes)
  pdf_bytes = new Buffer(pdf_bytes)
  console.log(pdf_bytes.buffer)
  pdf_bytes = await addPlaceholder(
    pdf_bytes
);
  const keys = await window.crypto.subtle.generateKey({
    name: "RSASSA-PKCS1-v1_5",
    hash: "SHA-384",
    modulusLength: 4096,
    publicExponent: new Uint8Array([0x01, 0x00, 0x01])
  },
    true,
    ["sign", "verify"]
  )
  const pkcs10 = new pkijs.CertificationRequest();

  pkcs10.subject.typesAndValues.push(new pkijs.AttributeTypeAndValue({
    type: "2.5.4.3",
    value: new asn1js.Utf8String({ value: "Username" })
  }));

  await pkcs10.subjectPublicKeyInfo.importKey(keys.publicKey);

  pkcs10.attributes = [];

  // await pdf_instance.signDocument({ placeholderSize: 22234 }, ({ hash, fileContents }) => {
  //   return new Promise(async (resolve, reject) => {
    console.log(pdf_bytes)
  let crypto_digest = await window.crypto.subtle.digest("SHA-384",pdf_bytes)
  hash(pdf_bytes)
  console.log(window.btoa(String.fromCharCode(...new Uint8Array(crypto_digest))))
  pkcs10.attributes.push(new pkijs.Attribute({
    type: "1.2.840.113549.1.9.14", // pkcs-9-at-extensionRequest
    values: [(new pkijs.Extensions({
      extensions: [
        new pkijs.Extension({
          extnID: "2.16.508.1.1.1.1", // id-ce-subjectAltName
          critical: false,
          extnValue: (new asn1js.Utf8String({ value: window.btoa(String.fromCharCode(...new Uint8Array(crypto_digest))) })).toBER(false)
        }),
      ]
    })).toSchema()]
  }));
  // Signing final PKCS#10 request
  await pkcs10.sign(keys.privateKey, "SHA-384");

  const pkcs10Raw = pkcs10.toSchema(true).toBER();
  const csr_contents = window.btoa(String.fromCharCode(...new Uint8Array(pkcs10Raw)));
  const csr_file = `
-----BEGIN CERTIFICATE REQUEST-----
${csr_contents}
-----END CERTIFICATE REQUEST-----
       `
  const csr = new File([csr_file], "test.csr")
  const form = new FormData();
  // Pass file stream directly to form
  form.append('csr', csr, 'file.pdf');
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
  // Load certificate in PEM encoding (base64 encoded DER)
  const pem = res.data
  console.log(pem)
  const b64 = pem.replace(/(-----(BEGIN|END) PKCS7-----|[\n\r])/g, '')
  const pkcs7 = forge.pkcs7.messageFromPem(pem)
  console.log(keys.privateKey)
  const exported = await window.crypto.subtle.exportKey("pkcs8", keys.privateKey)
  const exportedAsString = ab2str(exported);
  const exportedAsBase64 = window.btoa(exportedAsString);
  const pemExported = `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64}\n-----END PRIVATE KEY-----`;
  const privateKey = forge.pki.privateKeyFromPem(pemExported);
  console.log(privateKey, pkcs7.certificates)
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(privateKey, pkcs7.certificates, '');

  // var pkcs12Asn1 = forge.asn1.fromDer(pkcs12Der);
  var pkcs12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, "");
  pdf_bytes = sign(
    pdf_bytes,
    pkcs12,
  );
  hash(pdf_bytes)
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

}
// function Misc() {
//   // var privateKeyB = eccrypto.generatePrivate();
//   // var publicKeyB = eccrypto.getPublic(privateKeyB);
//   console.log(Buffer.from(privateKeyA).toString('hex'))
//   console.log(Buffer.from(publicKeyA).toString('hex'))
//   // eccrypto.derive(privateKeyA, publicKeyB).then(function(sharedKey1) {
//   //   eccrypto.derive(privateKeyB, publicKeyA).then(function(sharedKey2) {
//   //     console.log("Both shared keys are equal:", sharedKey1, sharedKey2);
//   //   });
//   // });
//   // const alice = createECDH('secp256k1');
//   // const bob = createECDH('secp256k1');

//   // // This is a shortcut way of specifying one of Alice's previous private
//   // // keys. It would be unwise to use such a predictable private key in a real
//   // application.
//   // alice.setPrivateKey(
//   //   createHash('sha256').update('alice', 'utf8').digest()
//   // );

//   // // Bob uses a newly generated cryptographically strong
//   // // pseudorandom key pair
//   // bob.generateKeys();

//   // const aliceSecret = alice.computeSecret(bob.getPublicKey(), null, 'hex');
//   // const bobSecret = bob.computeSecret(alice.getPublicKey(), null, 'hex');

//   // // aliceSecret and bobSecret should be the same shared secret value
//   // console.log(aliceSecret === bobSecret);
//   // console.log(typeof(alice.getPrivateKey()))
//   // console.log(Buffer.from(alice.getPrivateKey()).toString('hex'))
//   // console.log(Buffer.from(alice.getPublicKey()).toString('hex'))
//   return (  
//     <h1> hey </h1>
//   )
// }
function stringToArrayBuffer(binaryString) {
  const buffer = new ArrayBuffer(binaryString.length);
  let bufferView = new Uint8Array(buffer);
  for (let i = 0, len = binaryString.length; i < len; i++) {
    bufferView[i] = binaryString.charCodeAt(i);
  }
  return buffer;
}
export default assinar;


function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}

///////
// Talvez a assinatura do pdf em si tenha que ser feita em um microserviço que use o pyhanko
// Mesmo assim conseguimos -> criar o CSR enviar ao microserviço de PKI
// Receber PKCS#7 e enviar a webservice que une os dois e retorna o pdf assinado
///////