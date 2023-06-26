// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import axios from 'axios'
import type { NextApiRequest, NextApiResponse } from 'next'
import multiparty from "multiparty";
import fs from "fs"
import FormData from 'form-data'
import { getToken } from 'next-auth/jwt';
type Data = {
  name: string
}
export const config = {
    api: {
      bodyParser: false,
    },
  };

const secret = process.env.SECRET
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data | any>
) {
    const token = await getToken({ req, secret})
    const anytoken = token as any
    let access_token = anytoken.accessToken
    // console.log("TOKEN", token)
    if ( anytoken.accessTokenExpired * 1000 < Date.now()){
      return res.status(401).send({ error: "access token expired"})
      // if (anytoken.refreshTokenExpired< Date.now()){
      //   res.status(401)
      //   console.log("refresh token expired")
      //   res.send({ error: "refresh token expired"})
      //   return
      // }
      // const url = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`;
      // const data = new URLSearchParams({
      //   'client_id': process.env.KEYCLOAK_ID!,
      //   'grant_type': 'refresh_token',
      //   "client_secret": process.env.KEYCLOAK_SECRET!,
      //   'refresh_token': anytoken.refreshToken,
      // });

      // const auth_res = await axios.post(url, data, {
      //   headers: {
      //     'Content-Type': 'application/x-www-form-urlencoded'
      //   }
      // })
      // access_token = auth_res.data.access_token
    } 
    if(token){
      const form = new multiparty.Form();
      const data: any = await new Promise((resolve, reject) => {
        form.parse(req, function (err: any, fields: any, files: any) {
          if (err) reject({ err });
          resolve({ fields, files });
        });
      });
      const csr = fs.readFileSync(data.files.csr[0].path)
  
      const newForm = new FormData();
      newForm.append('csr', csr, {
          filename: data.files.csr[0].originalFilename,
      }
      );
      // envia o CSR e recebe um PKCS7
      const response = await axios.post(
          "http://pki-rnp:5004/pki/p7b/sign",
          newForm,
          {
              headers: {
                'Authorization': `Bearer ${token.accessToken}`,
                'Content-Type': `multipart/form-data; boundary=${newForm.getBoundary()}`,
              },
          }
      )
      res.status(200).send(response.data)
    }else{
      res.status(404)
    }
}
