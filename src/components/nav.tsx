import React from 'react';
import {signOut} from "next-auth/react"
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Button } from '@mui/material';
// import "./nav.css"
function Nav({session}: { session: any }) {
    return (
      <AppBar position="static">
      <Toolbar variant="regular">
        <Typography variant="h4" style={{padding:"15px 0px"}} color="inherit" component="div">
            Assinador
        </Typography>
      { session ? <Button component="a" style={{marginLeft: "auto"}} onClick={() => {signOut()}} color="inherit">Sair </Button> : <></>}
      </Toolbar>
    </AppBar>
        // <nav classNamev-heaR     r   //     <h1header-text">
        //     Assinador
        //     </h1>
        // </nav> 
  )
}

export default Nav;
