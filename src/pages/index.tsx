import Head from 'next/head'
import Image from 'next/image'
import { Inter } from 'next/font/google'
import Nav from '@/components/nav'
import Body from '@/components/body'

const inter = Inter({ subsets: ['latin'] })
import { useSession, signIn, signOut } from "next-auth/react"
export default function Home() {
  const { data: session } = useSession()

      return (
            <div>
              <Nav session={session} />
              <Body session={session}/>
            </div>
            
      )
}
