import React, { useCallback, useEffect, useState, useRef } from 'react';
// import "./body.css"
import { useDropzone } from 'react-dropzone'
import assinar, { AuthException } from '../misc/misc';
import Button from '@mui/material/Button' 
import Paper from '@mui/material/Paper' 
import {signIn, signOut} from 'next-auth/react'

function Body({session} : {session: any}) {
  const [_file, setFile] = useState<ArrayBuffer | null>(null);
  const [pdf_url, setPDFUrl] = useState("");
  const [filename, setFilename] = useState("");
  const [isSigning, setisSigning] = useState(false);
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // Do something with the files
    setFilename(acceptedFiles[0].name)
    acceptedFiles[0].arrayBuffer().then(value => setFile(value))
    
  }, [])
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  const handleClick = (click: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    // if (session.accessToken == null){
    click.currentTarget.disabled=true
    setisSigning(true)
    assinar(_file!, filename, session.user.name, session.user.email).catch((err) => {
      if(err instanceof AuthException){
        signIn("keycloak")
      } else{ 
        throw err
      }
    }).finally(() => {setisSigning(false)})
  }
  useEffect(() => {

    if (_file) {
      var url = URL.createObjectURL( new Blob([_file], {type: 'application/pdf'}));
      setPDFUrl(url)
    }      

  }, [_file])
  if (session){
    return (
      <div className='Body'>
      <Paper elevation={3} className='box' >
        {
          _file ?
          <div id="content" style={{display: "flex", alignItems:"center", flexDirection:"column"}}>
              
              <iframe width="80%" height="80%" style={{marginTop:"20px"}}  src={pdf_url} /> 
              <div id='sign'>
                <Button variant='contained' className='button' color='error' onClick={click => setFile(null)}>Remover arquivo</Button>
                <Button variant='contained' disabled={isSigning} className='button is-info' onClick={handleClick}>Assinar</Button>
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
      </Paper>
      </div>
  )
} else {
  return (
  <div className='Body'>
  <Paper elevation={3} className='box' >
  <Button variant='contained' className='button is-info' onClick={ () => {signIn("keycloak")}}>Realizar Autenticação</Button>
  </Paper>
  </div>
  )
  }
}

export default Body;
