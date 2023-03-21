import {
    PDFDocument,
    PDFName,
    PDFNumber,
    PDFHexString,
    PDFString,
    PDFRef
  } from "pdf-lib";
import PDFArrayCustom from "./pdfArrayCustom";
class SignPdfError extends Error{}


var forge = require('node-forge');

const findByteRange = (pdf) => {
    if (!(pdf instanceof Buffer)) {
        throw new SignPdfError(
            'PDF expected as Buffer.',
            SignPdfError.TYPE_INPUT,
        );
    }

    const byteRangeStrings = pdf.toString().match(/\/ByteRange\s*\[{1}\s*(?:(?:\d*|\/\*{10})\s+){3}(?:\d+|\/\*{10}){1}\s*]{1}/g);

    if (!byteRangeStrings) {
        throw new SignPdfError(
            'No ByteRangeStrings found within PDF buffer',
            SignPdfError.TYPE_PARSE,
        );
    }

    const byteRangePlaceholder = byteRangeStrings.find((s) => s.includes(`/${'**********'}`));
    const byteRanges = byteRangeStrings.map((brs) => brs.match(/[^[\s]*(?:\d|\/\*{10})/g));

    return {
        byteRangePlaceholder,
        byteRangeStrings,
        byteRanges,
    };
};

const sliceLastChar = (pdf, character) => {
    const lastChar = pdf.slice(pdf.length - 1).toString();
    if (lastChar === character) {
        return pdf.slice(0, pdf.length - 1);
    }

    return pdf;
};

/**
 * Removes a trailing new line if there is such.
 *
 * Also makes sure the file ends with an EOF line as per spec.
 * @param {Buffer} pdf
 * @returns {Buffer}
 */
const removeTrailingNewLine = (pdf) => {
    if (!(pdf instanceof Buffer)) {
        throw new SignPdfError(
            'PDF expected as Buffer.',
            SignPdfError.TYPE_INPUT,
        );
    }
    let output = pdf;

    output = sliceLastChar(output, '\n');
    output = sliceLastChar(output, '\r');

    const lastLine = output.slice(output.length - 6).toString();
    if (lastLine !== '\n%%EOF') {
        throw new SignPdfError(
            'A PDF file must end with an EOF line.',
            SignPdfError.TYPE_PARSE,
        );
    }

    return output;
};


async function calculate_content_bytes(pdfBuffer){
    
    let pdf = removeTrailingNewLine(pdfBuffer);

    // Find the ByteRange placeholder.
    const {byteRangePlaceholder} = findByteRange(pdf);

    if (!byteRangePlaceholder) {
        throw new SignPdfError(
            `Could not find empty ByteRange placeholder: ${byteRangePlaceholder}`,
            SignPdfError.TYPE_PARSE,
        );
    }

    const byteRangePos = pdf.indexOf(byteRangePlaceholder);

    // Calculate the actual ByteRange that needs to replace the placeholder.
    const byteRangeEnd = byteRangePos + byteRangePlaceholder.length;
    const contentsTagPos = pdf.indexOf('/Contents ', byteRangeEnd);
    const placeholderPos = pdf.indexOf('<', contentsTagPos);
    const placeholderEnd = pdf.indexOf('>', placeholderPos);
    const placeholderLengthWithBrackets = (placeholderEnd + 1) - placeholderPos;
    const byteRange = [0, 0, 0, 0];
    byteRange[1] = placeholderPos;
    byteRange[2] = byteRange[1] + placeholderLengthWithBrackets;
    byteRange[3] = pdf.length - byteRange[2];
    let actualByteRange = `/ByteRange [${byteRange.join(' ')}]`;
    actualByteRange += ' '.repeat(byteRangePlaceholder.length - actualByteRange.length);
    // Replace the /ByteRange placeholder with the actual ByteRange
    pdf = Buffer.concat([
        pdf.slice(0, byteRangePos),
        Buffer.from(actualByteRange),
        pdf.slice(byteRangeEnd),
    ]);

    // Remove the placeholder signature
    pdf = Buffer.concat([
        pdf.slice(0, byteRange[1]),
        pdf.slice(byteRange[2], byteRange[2] + byteRange[3]),
    ]);
    let crypto_digest = await window.crypto.subtle.digest("SHA-384", pdf)
    const hashArray = Array.from(new Uint8Array(crypto_digest));                     // convert buffer to byte array
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
    return hashHex
}


function sign(
    pdfBuffer,
    p12Object,
    additionalOptions = {},
) {

    if (!(pdfBuffer instanceof Buffer)) {
        throw new SignPdfError(
            'PDF expected as Buffer.',
            SignPdfError.TYPE_INPUT,
        );
    }
    // remove \n no final do arquivo caso exista
    let pdf = removeTrailingNewLine(pdfBuffer);
    console.log(pdf.length)

    // Acha o byte range da assinatura placeholder
    const {byteRangePlaceholder} = findByteRange(pdf);

    if (!byteRangePlaceholder) {
        throw new SignPdfError(
            `Could not find empty ByteRange placeholder: ${byteRangePlaceholder}`,
            SignPdfError.TYPE_PARSE,
        );
    }
    // pega a posição do placeholder nos bytes
    const byteRangePos = pdf.indexOf(byteRangePlaceholder);

    // Calcula o ByteRange que vai atualizar o placeholder
    const byteRangeEnd = byteRangePos + byteRangePlaceholder.length;
    // Acha o indice da flag de conteúdo da assinatura
    const contentsTagPos = pdf.indexOf('/Contents ', byteRangeEnd);
    // inicio do placeholder "sempre tem esse <"
    const placeholderPos = pdf.indexOf('<', contentsTagPos);
    // fim do placeholder
    const placeholderEnd = pdf.indexOf('>', placeholderPos);
    // tamanho com < e >
    const placeholderLengthWithBrackets = (placeholderEnd + 1) - placeholderPos;
    // tamanho sem <>
    const placeholderLength = placeholderLengthWithBrackets - 2;
    // atualiza o byte range da assinatura
    const byteRange = [0, 0, 0, 0];
    // 0 - começo da assinatura
    byteRange[1] = placeholderPos;
    // depois da assinatura
    byteRange[2] = byteRange[1] + placeholderLengthWithBrackets;
    // até o fim do pdf
    byteRange[3] = pdf.length - byteRange[2];
    // bota em uma string
    let actualByteRange = `/ByteRange [${byteRange.join(' ')}]`;
    actualByteRange += ' '.repeat(byteRangePlaceholder.length - actualByteRange.length);

    // Troca o byte Range com **** que esta no documento pelo novo
    pdf = Buffer.concat([
        pdf.slice(0, byteRangePos),
        Buffer.from(actualByteRange),
        pdf.slice(byteRangeEnd),
    ]);

    // Remove o conteúdo da assinatura 
    pdf = Buffer.concat([
        pdf.slice(0, byteRange[1]),
        pdf.slice(byteRange[2], byteRange[2] + byteRange[3]),
    ]);

    // Carrega pkcs12
    const p12 = p12Object

    // extrai bolsas de certificado e de chaves
    const certBags = p12.getBags({
        bagType: forge.pki.oids.certBag,
    })[forge.pki.oids.certBag];
    const keyBags = p12.getBags({
        bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
    })[forge.pki.oids.pkcs8ShroudedKeyBag];

    // pega chave privada do certificado
    const privateKey = keyBags[0].key;
    // Cria pkcs7.
    const p7 = forge.pkcs7.createSignedData();
    // coloca o conteúdo como sendo os bytes do pdf.
    p7.content = forge.util.createBuffer(pdf.toString('binary'));

    // Adiciona certificados e chaves públicas ao pkcs7
    let certificate;
    Object.keys(certBags).forEach((i) => {
        const {publicKey} = certBags[i].cert;

        p7.addCertificate(certBags[i].cert);

        // Try to find the certificate that matches the private key.
        if (privateKey.n.compareTo(publicKey.n) === 0
            && privateKey.e.compareTo(publicKey.e) === 0
        ) {
            certificate = certBags[i].cert;
        }
    });

    if (typeof certificate === 'undefined') {
        throw new SignPdfError(
            'Failed to find a certificate that matches the private key.',
            SignPdfError.TYPE_INPUT,
        );
    }
    let timestamp = new Date()
    timestamp.setSeconds(timestamp.getSeconds() + 1)
    // Adiciona o assinador
    p7.addSigner({
        key: privateKey,
        certificate,
        digestAlgorithm: forge.pki.oids.sha384, // Libreoffice won't recognize sha384 digest but sha256 will work
        authenticatedAttributes: [
            {
                type: forge.pki.oids.contentType,
                value: forge.pki.oids.data,
            }, {
                type: forge.pki.oids.signingTime,
                value: timestamp,
            },
            {
                type: forge.pki.oids.digestedData,
                // este acaba vindo vazio mas como o assinador espera o hash na chave 3 tive que colocar
            },
            {
                type: forge.pki.oids.messageDigest
            },
        ],
    });

    // Asssina em modo detached
    p7.sign({detached: true});

    // converta assinatura pra bytes e checa se o pdf tem um placeholder caiba a assinatura
    const raw = forge.asn1.toDer(p7.toAsn1()).getBytes();
    if ((raw.length * 2) > placeholderLength) {
        throw new SignPdfError(
            `Signature exceeds placeholder length: ${raw.length * 2} > ${placeholderLength}`,
            SignPdfError.TYPE_INPUT,
        );
    }
    // converte assinatura pra hex
    let signature = Buffer.from(raw, 'binary').toString('hex');

    // Adiciona 0 ao final da assinatura dela caso seja menor que o placeholder
    signature += Buffer
        .from(String.fromCharCode(0).repeat((placeholderLength / 2) - raw.length))
        .toString('hex');

    // Coloca ela no documento
    pdf = Buffer.concat([
        pdf.slice(0, byteRange[1]),
        Buffer.from(`<${signature}>`),
        pdf.slice(byteRange[1]),
    ]);
    console.log(pdf)

    return pdf;
  }
  function unit8ToBuffer(unit8) {
    let buf = Buffer.alloc(unit8.byteLength);
    const view = new Uint8Array(unit8);

    for (let i = 0; i < buf.length; ++i) {
      buf[i] = view[i];
    }
    return buf;
}
async function addPlaceholder(pdf_doc) {
    const before = pdf_doc.length
    const loadedPdf = await PDFDocument.load(pdf_doc);
    const lastIdx = loadedPdf.context.largestObjectNumber
    const form = loadedPdf.getForm()
    let form_exists = false
    if (form.acroForm.getAllFields().length > 0){
        form_exists = true
    }else {
        form_exists = false
    }
    const pdf_doc_string = pdf_doc.toString("ascii")
    let catalogMatches = [...pdf_doc_string.matchAll(/\d* 0 obj\n<<\n?\/Type \/Catalog/g)]
    catalogMatches = catalogMatches.map(match => match.index)
    const catalogidx = Math.max(...catalogMatches)
    // const catalogidx = pdf_doc_string.search(/\d* 0 obj\n<<\n?\/Type \/Catalog/g)
    const catalogdiff = pdf_doc_string.slice(catalogidx).search(/endobj/) + 6 
    let catalogstring = pdf_doc_string.slice(catalogidx, catalogidx+catalogdiff)
    if(catalogstring.includes("AcroForm")){
        if (catalogstring.includes("Fields")){
            catalogstring = catalogstring.replace("/Fields [", `/Fields [${lastIdx+2} 0 R `)
        } else {
            throw Error("Not sure what to do")
        }
        debugger
    }else {
        const sliceIndex = catalogstring.search(/Catalog\n/)+8
        catalogstring = catalogstring.slice(0,sliceIndex) + `/AcroForm <<\n/Fields [${lastIdx+2} 0 R]\n/SigFlags 2\n>>` + catalogstring.slice(sliceIndex)
    }
    let pageMatches = [...pdf_doc_string.matchAll(/\d* 0 obj\n<<\n?\/Type \/Page[^s]{1}/g)]
    pageMatches = pageMatches.map(match => match.index)
    const pageidx = Math.max(...pageMatches)
    const pagediff = pdf_doc_string.slice(pageidx).search(/endobj/) + 6 
    let pageString = pdf_doc_string.slice(pageidx, pageidx+pagediff)
    if(pageString.includes("Annots")){
        pageString = pageString.replace("/Annots [", `/Annots [${lastIdx+2} 0 R `)
    }else {
        const sliceIndex = pageString.search("/Page\n") + 6 
        pageString = pageString.slice(0,sliceIndex) + `/Annots [${lastIdx+2} 0 R]\n` + pageString.slice(sliceIndex)
    }
    
    let prevmatches = pdf_doc_string.match(/\nstartxref\n\d*/g)
    prevmatches = prevmatches.map(match => parseInt(match.replace("\nstartxref\n", "")))
    const prev = Math.max(...prevmatches)
    const SIGNATURE_LENGTH = 15000;
    console.log(before, prev)
    const append = `

${lastIdx +1} 0 obj
<<
/Type /Sig
/Filter /Adobe.PPKLite
/SubFilter /adbe.pkcs7.detached
/ByteRange [0 /********** /********** /**********]
/Contents <${'A'.repeat(SIGNATURE_LENGTH)}>
/Reason (We need your signature for reasons...)
/M (D:20230316130812Z)
>>
endobj

${lastIdx +2} 0 obj
<<
/Type /Annot
/Subtype /Widget
/FT /Sig
/Rect [ 0 0 0 0 ]
/T (test signature)
/F 4
/P 2 0 R
/V ${lastIdx+1} 0 R
>>
endobj
${catalogstring}
${pageString}
`
    const bytes_appended_doc_string = Buffer.concat([pdf_doc, Buffer.from(append)]) 
    const appended_doc_string = bytes_appended_doc_string.toString("ascii")
    let foundPageMatches = [...appended_doc_string.matchAll(/\d* 0 obj\n<<\n?\/Type \/Page[^s]{1}/g)]
    foundPageMatches = foundPageMatches.map(match => match.index)
    const found_page_idx = Math.max(...foundPageMatches)

    let foundCatalogMatches = [...appended_doc_string.matchAll(/\d* 0 obj\n<<\n?\/Type \/Catalog/g)]
    foundCatalogMatches = foundCatalogMatches.map(match => match.index)
    const found_catalog_idx = Math.max(...foundCatalogMatches)
    // const found_catalog_idx = appended_doc_string.search(catalogstring.slice(0,45)) - 1 
    // const found_page_idx = appended_doc_string.search(pageString.slice(0,30)) - 1
    const buffer_idx = appended_doc_string.search("A".repeat(15000)) 
    const xref = `
xref
${pdf_doc_string.slice(pageidx, pageidx+1)} 1
${"0".repeat(10 - found_page_idx.toString().length)}${found_page_idx} 00000 n
${pdf_doc_string.slice(catalogidx, catalogidx+1)} 1
${"0".repeat(10 - found_catalog_idx.toString().length)}${found_catalog_idx} 00000 n

${lastIdx +1} 2 
${"0".repeat(10 - (buffer_idx-140).toString().length)}${buffer_idx-140} 00000 n 
${"0".repeat(10 - (buffer_idx+15084).toString().length)}${buffer_idx+15084} 00000 n 

trailer
<<
/Size ${lastIdx+2} /Prev ${prev}
>>

startxref
`
    debugger
    const bytesXrefDocString = Buffer.concat([bytes_appended_doc_string, Buffer.from(xref)])
    const xrefDocString = bytesXrefDocString.toString("ascii")
    let matches = [...xrefDocString.matchAll(/\nxref/g)]
    
    matches = matches.map(match => match.index)
    const lastxref = Math.max(...matches)
    // Math.max(...matches)
    let eof = `${lastxref}
%%EOF`
    pdf_doc = Buffer.concat([bytesXrefDocString ,Buffer.from(eof)])
    console.log(typeof pdf_doc)
    console.log(pdf_doc.length)
    console.log(Buffer.from(pdf_doc).length)
    return pdf_doc
  }

export {sign, addPlaceholder, calculate_content_bytes};
