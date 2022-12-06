import React, { useCallback, useEffect, useState, useRef } from 'react';
import "./body.css"
import { useDropzone } from 'react-dropzone'
import assinar from '../misc/misc';

function Body() {
  const [_file, setFile] = useState(null);
  const [pdf_url, setPDFUrl] = useState(null);
  const [filename, setFilename] = useState(null);
  const onDrop = useCallback(acceptedFiles => {
    // Do something with the files
    setFilename(acceptedFiles[0].name)
    console.log(acceptedFiles)
    acceptedFiles[0].arrayBuffer().then(value => setFile(value))
    
  }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  const handleClick = click => {
    click.currentTarget.disabled=true
    assinar(_file, filename)
  }
  useEffect(() => {

    if (_file) {
      console.log(typeof(_file))
      var url = URL.createObjectURL( new Blob([_file], {type: 'application/pdf'}));
      setPDFUrl(url)
    }      

  }, [_file])

  return (
    <div className='Body'>
      <div className='box' >
        {
          _file ?
            <div id="content">
              <iframe width="100%" height="80%" src={pdf_url} /> 
              <div id='sign'>
                <button className='button is-warning' onClick={click => setFile(null)}>Remover arquivo</button>
                <button className='button is-info' onClick={handleClick}>Assinar</button>
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
