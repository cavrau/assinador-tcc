import React from 'react';

import eccrypto from "eccrypto"
function Misc() {
  var privateKeyA = eccrypto.generatePrivate();
  var publicKeyA = eccrypto.getPublic(privateKeyA);
  // var privateKeyB = eccrypto.generatePrivate();
  // var publicKeyB = eccrypto.getPublic(privateKeyB);
  console.log(Buffer.from(privateKeyA).toString('hex'))
  console.log(Buffer.from(publicKeyA).toString('hex'))
  // eccrypto.derive(privateKeyA, publicKeyB).then(function(sharedKey1) {
  //   eccrypto.derive(privateKeyB, publicKeyA).then(function(sharedKey2) {
  //     console.log("Both shared keys are equal:", sharedKey1, sharedKey2);
  //   });
  // });
  // const alice = createECDH('secp256k1');
  // const bob = createECDH('secp256k1');
  
  // // This is a shortcut way of specifying one of Alice's previous private
  // // keys. It would be unwise to use such a predictable private key in a real
  // application.
  // alice.setPrivateKey(
  //   createHash('sha256').update('alice', 'utf8').digest()
  // );
  
  // // Bob uses a newly generated cryptographically strong
  // // pseudorandom key pair
  // bob.generateKeys();
  
  // const aliceSecret = alice.computeSecret(bob.getPublicKey(), null, 'hex');
  // const bobSecret = bob.computeSecret(alice.getPublicKey(), null, 'hex');
  
  // // aliceSecret and bobSecret should be the same shared secret value
  // console.log(aliceSecret === bobSecret);
  // console.log(typeof(alice.getPrivateKey()))
  // console.log(Buffer.from(alice.getPrivateKey()).toString('hex'))
  // console.log(Buffer.from(alice.getPublicKey()).toString('hex'))
  return (  
    <h1> hey </h1>
  )
}

export default Misc;
