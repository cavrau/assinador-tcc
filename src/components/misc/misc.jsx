import eccrypto from "eccrypto"
import * as pkijs from 'pkijs'

import * as asn1js from 'asn1js'
import {plainAddPlaceholder, SUBFILTER_ETSI_CADES_DETACHED, } from 'node-signpdf'

async function assinar(_file) {
  console.log(_file)
  
  const keys = await window.crypto.subtle.generateKey(  {
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
  // pkcs10.subject.typesAndValues.push(new pkijs.AttributeTypeAndValue({
  //   type: "2.5.4.3", TODO: VER PARA CN
  //   value: new asn1js.Utf8String({ value: "Test" })
  // }));
  
  
   await pkcs10.subjectPublicKeyInfo.importKey(keys.publicKey);
  
   pkcs10.attributes = [];
  
   // Subject Alternative Name
   const altNames = new pkijs.GeneralNames({
     names: [
       new pkijs.GeneralName({ // email
         type: 1,
         value: "email@address.com"
       }),
       new pkijs.GeneralName({ // domain
         type: 2,
         value: "www.domain.com"
       }),
      ]
    });
    let d = _file
    let a = plainAddPlaceholder({
     pdfBuffer:new Buffer(_file),
     signatureLength: 22234
   });
   let b = plainAddPlaceholder({
    pdfBuffer:new Buffer(d),
    signatureLength: 22234
  });
   console.log(a==b)
   let crypto_digest = await window.crypto.subtle.digest("SHA-384", a)
   // SubjectKeyIdentifier
   const subjectKeyIdentifier = await window.crypto.subtle.digest({ name: "SHA-1" }, pkcs10.subjectPublicKeyInfo.subjectPublicKey.valueBlock.valueHex);
  
   pkcs10.attributes.push(new pkijs.Attribute({
     type: "1.2.840.113549.1.9.14", // pkcs-9-at-extensionRequest
     values: [(new pkijs.Extensions({
       extensions: [
        //  new pkijs.Extension({
        //    extnID: "2.5.29.14", // id-ce-subjectKeyIdentifier
        //    critical: false,
        //    extnValue: (new asn1js.OctetString({ valueHex: subjectKeyIdentifier })).toBER(false)
        //  }),
         new pkijs.Extension({
           extnID: "2.16.508.1.1.1.1", // id-ce-subjectAltName
           critical: false,
           extnValue: (new asn1js.Utf8String({ value: window.btoa(String.fromCharCode(...new Uint8Array(crypto_digest))) })).toBER(false)
         }),
        //  new pkijs.Extension({
        //    extnID: "1.2.840.113549.1.9.7", // pkcs-9-at-challengePassword
        //    critical: false,
        //    extnValue: (new asn1js.PrintableString({ value: "passwordChallenge" })).toBER(false)
        //  })
        
        //  new pkijs.Extension({
        //    extnID: "2.16.508.1.1.1.1", // id-ce-subjectAltName
        //    critical: false,
        //    extnValue: altNames.toSchema().toBER(false)
        //  }),
       ]
     })).toSchema()]
   }));
  
   // Signing final PKCS#10 request
   await pkcs10.sign(keys.privateKey, "SHA-256");
  
   const pkcs10Raw = pkcs10.toSchema(true).toBER();
   const csr_contents = window.btoa(String.fromCharCode(...new Uint8Array(pkcs10Raw)));
   const csr_file = `
   -----BEGIN CERTIFICATE REQUEST-----
   ${csr_contents}
   -----END CERTIFICATE REQUEST-----
   `
   console.log(csr_file)
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

export default assinar;
