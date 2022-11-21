import React, { useCallback, useEffect, useState } from 'react';
import "./body.css"
import { useDropzone } from 'react-dropzone'
import PdfViewerComponent from '../container/container';
import assinar from '../misc/misc';

function Body() {
  const [_file, setFile] = useState(null);
  const [f_file, setFFile] = useState(null);
  const onDrop = useCallback(acceptedFiles => {
    // Do something with the files
    console.log(acceptedFiles[0]);
    acceptedFiles[0].arrayBuffer().then(value => setFile(value))
    acceptedFiles[0].arrayBuffer().then(value => setFFile(value))
  }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  return (
    <div className='Body'>
      <div className='box' >
        {
          _file ?
            <div id="content">
              <PdfViewerComponent document={_file} />
              <div id='sign'>
                <button className='button is-warning' onClick={click => setFile(null)}>Remover arquivo</button>
                <button className='button is-info' onClick={click => assinar(f_file)}>Assinar</button>
              </div>
            </div> :
            <div  {...getRootProps()} id="empty-content">
              <input {...getInputProps()} />
              {
                isDragActive ?
                  <div /> :
                  <p id="texto"><strong>Clique aqui ou arraste arquivos para carregar</strong></p>
              }
            </div>
        }
      </div>
    </div>
  )
}

export default Body;
