import * as pkijs from 'pkijs'

import * as asn1js from 'asn1js'
import { sign, addPlaceholder, calculate_content_bytes } from "./sign"
import axios from 'axios';
var forge = require('node-forge');

async function assinar(pdf_bytes, filename) {
    pdf_bytes = new Buffer(pdf_bytes)
    pdf_bytes = await addPlaceholder(
        pdf_bytes
    );
    const hash_value = await calculate_content_bytes(pdf_bytes)
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
        value: new asn1js.Utf8String({ value: `Username` })
    }));

    await pkcs10.subjectPublicKeyInfo.importKey(keys.publicKey);

    pkcs10.attributes = [];

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
    const pkcs7 = forge.pkcs7.messageFromPem(res.data)
    const exported = await window.crypto.subtle.exportKey("pkcs8", keys.privateKey)
    const exportedAsString = ab2str(exported);
    const exportedAsBase64 = window.btoa(exportedAsString);
    const pemExported = `-----BEGIN PRIVATE KEY-----\n${exportedAsBase64}\n-----END PRIVATE KEY-----`;
    const privateKey = forge.pki.privateKeyFromPem(pemExported);
    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(privateKey, pkcs7.certificates, '');

    // var pkcs12Asn1 = forge.asn1.fromDer(pkcs12Der);
    var pkcs12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, "");
    pdf_bytes = sign(
        pdf_bytes,
        pkcs12,
    );

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
export default assinar;


function ab2str(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}
