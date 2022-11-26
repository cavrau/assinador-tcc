import * as pkijs from 'pkijs'

import * as asn1js from 'asn1js'
import axios from 'axios';

async function assinar(pdf_instance, filename) {

  const keys = await window.crypto.subtle.generateKey({
    name: "ECDSA",
    namedCurve: "P-384"
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

  await pdf_instance.signDocument({ placeholderSize: 22234 }, ({ hash, fileContents }) => {
    return new Promise(async (resolve, reject) => {
      let crypto_digest = await window.crypto.subtle.digest("SHA-384", fileContents)

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
      const b64 = pem.replace(/(-----(BEGIN|END) PKCS7-----|[\n\r])/g, '')
      // Now that we have decoded the cert it's now in DER-encoding
      const der = Buffer(b64, 'base64')

      // // And massage the cert into a BER encoded one
      const ber = new Uint8Array(der).buffer
      // console.log(ber)

      // // And now Asn1js can decode things \o/
      // const asn1 = asn1js.fromBER(ber);
      // console.log(asn1.result)
      // // if (asn1.offset === -1) {
      // //   throw new Error("Incorrect encoded ASN.1 data");
      // // }

      // const info = new pkijs.ContentInfo({ schema: asn1.result });
      // const data = new pkijs.SignedData({ schema: info.content });
      // // console.log(res.data)
      // console.log(info)
      // console.log(data)
      // reject()
      resolve(stringToArrayBuffer(ber))
      // const PKCS7Container = getPKCS7Container(hash, fileContents);
      // if (PKCS7Container != null) {
      //   return resolve(PKCS7Container)
      // }
      // reject(new Error("Could not retrieve the PKCS7 container."))
    })
  }).then( function () {
    console.log("Document signed!");
  })
  console.log("HEEREEE")
  let b = await window.crypto.subtle.digest("SHA-384", await pdf_instance.exportPDF())
  console.log(window.btoa(String.fromCharCode(...new Uint8Array(b))))

  const link = document.createElement('a');
  const new_filename = filename.replace(".pdf", "assinado.pdf")
  const blob = new Blob([await pdf_instance.exportPDF()]);
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

  // const signer = new SignPdf()
  // const signedPdf = signer.sign(a, Buffer.from(res.data), { passphrase: 'pass:' });
  // const bufferPdf = Buffer.from(signedPdf)
  // var msg = crypto.createHash("sha256").update(_file).digest();

  // eccrypto.sign(privateKey, msg).then(function(sig) {
  //   console.log("Signature in DER format:", sig);
  //   eccrypto.verify(publicKey, msg, sig).then(function() {
  //     console.log("Signature is OK");
  //   }).catch(function() {
  //     console.log("Signature is BAD");
  //   });
  // });
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



///////
// Talvez a assinatura do pdf em si tenha que ser feita em um microserviço que use o pyhanko
// Mesmo assim conseguimos -> criar o CSR enviar ao microserviço de PKI
// Receber PKCS#7 e enviar a webservice que une os dois e retorna o pdf assinado
///////