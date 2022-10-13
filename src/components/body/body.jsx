import React, {useCallback, useState}from 'react';
import "./body.css"
import {useDropzone} from 'react-dropzone'
import { Document, Page } from 'react-pdf'

function Body() {
    const [_file, setFile] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const onDrop = useCallback(acceptedFiles => {
        // Do something with the files
        console.log(acceptedFiles[0]);
        setFile(acceptedFiles[0])
      }, [])
      const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop})
      function onDocumentLoadSuccess({ numPages }) {
        setPageNumber(0);
      }
    
    return (
        <div {...getRootProps()} className='Body'>
            <input {...getInputProps()} />
            {
            isDragActive ?
            <p>Drop the files here ...</p> :
            <p>Drag 'n' drop some files here, or click to select files</p>
        }

        <Document file={_file ? new Uint8Array(_file.arrayBuffer()) : null} onLoadSuccess={onDocumentLoadSuccess}>
          <Page pageNumber={pageNumber} />
        </Document>
        </div>
  )
}

export default Body;
