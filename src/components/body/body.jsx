import React, {useCallback, useState}from 'react';
import "./body.css"
import {useDropzone} from 'react-dropzone'
import PdfViewerComponent from '../container/container';

function Body() {
    const [_file, setFile] = useState(null);
    const onDrop = useCallback(acceptedFiles => {
        // Do something with the files
        console.log(acceptedFiles[0]);
        acceptedFiles[0].arrayBuffer().then(value => setFile(value))
      }, [])
      const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop})

    
    return (
        <div {...getRootProps()} className='Body'>
          <div id="content">
            <input {...getInputProps()} />
            {
              _file ?
              <div onClick={click => setFile(null)}>
                <p>Click here to Change File</p>
              </div> :
              <div>
                {
                  isDragActive?
                  <p>Drop the files here ...</p> :
                  <p>Drag 'n' drop some files here, or click to select files</p>
                }
              </div>
            }
            <div id="pdf-container">
              {
                _file ?
                <PdfViewerComponent document={ _file} /> :
                <div></div>
              }
            </div>
          </div>
        </div>
  )
}

export default Body;
