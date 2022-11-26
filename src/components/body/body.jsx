import React, { useCallback, useEffect, useState, useRef } from 'react';
import "./body.css"
import { useDropzone } from 'react-dropzone'
import assinar from '../misc/misc';

function Body() {
  const [_file, setFile] = useState(null);
  const [pdf_instance, setPDFInstance] = useState(null);
  const [filename, setFilename] = useState(null);
  const onDrop = useCallback(acceptedFiles => {
    // Do something with the files
    setFilename(acceptedFiles[0].name)
    acceptedFiles[0].arrayBuffer().then(value => setFile(value))
    
  }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  const containerRef = useRef(null);
  useEffect(() => {
    console.log(_file)
    if (_file) {
      
      const container = containerRef.current;
      let PSPDFKit;

      (async function () {
        PSPDFKit = await import("pspdfkit");
        setPDFInstance(await PSPDFKit.load({
          // Container where PSPDFKit should be mounted.
          container,
          // The document to open.
          document: _file,
          // Use the public directory URL as a base URL. PSPDFKit will download its library assets from here.
          baseUrl: `${window.location.protocol}//${window.location.host}/${process.env.PUBLIC_URL}`
        })
        )

        pdf_instance.setToolbarItems([]);
      })();
      return () => PSPDFKit && PSPDFKit.unload(container);
    }

  }, [_file])

  return (
    <div className='Body'>
      <div className='box' >
        {
          _file ?
            <div id="content">
              <div ref={containerRef} style={{ width: "100%", height: "60vh" }} />
              <div id='sign'>
                <button className='button is-warning' onClick={click => setFile(null)}>Remover arquivo</button>
                <button className='button is-info' onClick={click => assinar(pdf_instance, filename)}>Assinar</button>
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
