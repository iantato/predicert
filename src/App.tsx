import { useCallback, useEffect, useState } from 'react'
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js'
import { Program, AnchorProvider, web3 } from '@project-serum/anchor'

import buffer from 'buffer'

import { getProvider } from './utils'
import idl from './idl/sendvote.json'

import phantomLogo from './assets/phantom.svg'
import './App.css'
import { PhantomProvider } from './types'


function App() {

  window.Buffer = buffer.Buffer
  const anyWindow: any = window

  // @ts-ignore
  const [pubKey, setPubKey] = useState(null)
  const [buttonText, setButtonText] = useState("Connect Phantom Wallet")
  const [commentHidden, setHidden] = useState(false)
  
  const [yesPercentage, setYes] = useState(0)
  const [noPercentage, setNo] = useState(0)

  // - Get information from the Phantom Wallet.
  // ---------------------------------------
  const url = clusterApiUrl("devnet")
  const connection = new Connection(url, 'processed')
  
  const provider = getProvider()
  const anchorProvider = new AnchorProvider(
    connection, anyWindow.solana, { preflightCommitment : 'processed' }
  )
  const programID = new PublicKey(idl.metadata.address)
  const stringedIDL = JSON.stringify(idl)
  const parsedIDL = JSON.parse(stringedIDL)
  const program = new Program(parsedIDL, idl.metadata.address, anchorProvider)
  // ---------------------------------------

  // - Handle Connection
  const handleConnection = useCallback(async() => {
    if (!provider) return

    try {
      await provider.connect()
      
      // @ts-ignore
      var pubString = provider.publicKey.toString()
      setButtonText(pubString.substring(0,10) + '...' + pubString.substring(pubString.length - 5, pubString.length))

    } catch (error) {
      
    }
  }, [provider])

  // - Handle Automatic Connection and Public Key Management.
  useEffect(() => {
    if (!provider) return

    provider.connect({ onlyIfTrusted: true }).catch(() => {})

    // - On connection.
    provider.on('connect', (publicKey : PhantomProvider) => {
      var pubString = publicKey.toString()
      setButtonText(pubString.substring(0,10) + '...' + pubString.substring(pubString.length - 5, pubString.length))
    })

    // - On disconnection.
    provider.on('disconnect', () => {
      setPubKey(null)
    })

    // - On account change.
    provider.on('accountChanged', (publicKey : PhantomProvider) => {
      if (publicKey) {
        // @ts-ignore
        setPubKey(publicKey)
        var pubString = publicKey.toString()
        setButtonText(pubString.substring(0,10) + '...' + pubString.substring(pubString.length - 5, pubString.length))
      } else {
        // @ts-ignore
        provider.connect().catch((error) => {
        })
      }
    })
  })
  // ---------------------------------------

  // - Handle add message
  // ---------------------------------------
  async function addYes() {

    // @ts-ignore
    const messageAccount = new web3.Keypair()
  
    const [pda,] = await web3.PublicKey.findProgramAddressSync(
      [anchorProvider.wallet.publicKey.toBuffer()],
      program.programId
    )

    await program.methods.addMessage("Yes").accounts({
      messageAccount: pda,
      signer: anchorProvider.wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    }).rpc()


  }

  async function addNo() {

    // @ts-ignore
    const messageAccount = new web3.Keypair()


    const [pda,] = await web3.PublicKey.findProgramAddressSync(
      [anchorProvider.wallet.publicKey.toBuffer()],
      program.programId
    )

    await program.methods.addMessage("No").accounts({
      messageAccount: pda,
      signer: anchorProvider.wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    }).rpc()
  }

  async function fetchData() {
    
    const programAccounts = await connection.getProgramAccounts(programID)

    const total = programAccounts.length
    let yesCounter = 0
    let noCounter = 0

    // @ts-ignore
    Promise.all((await connection.getProgramAccounts(programID)).map(async(tx, index) => {
      const messageAccount = program.account.messageAccount.fetch(tx.pubkey)
      messageAccount.then((msg) => {
        // @ts-ignore
        if (msg.msg.toString() == "Yes") {
          yesCounter++
          setYes((yesCounter / total) * 100)
        } else {
          noCounter++
          setNo((noCounter / total) * 100)
        }
      })
    }))

    setHidden(true)
  }
  // ---------------------------------------

  return (
    <>
      <div id="frame">
        <div id="title">
          <h1> PrediCert </h1>
          <button id="phantom" onClick={handleConnection}>
            <img src={phantomLogo} alt="phantom" />
            {buttonText}
          </button>
        </div>
        
        <div id="boxes">
          <div id="content">
            <p>
            <span className="gray">&#47;&#47; You Can Only Vote Once</span>
            </p>
            <p>
              Will 
              <span className="purple"> Ian </span>
              be able to get the 
              <span className="purple"> Solana Developer </span>
              certification?
            </p>

            <div>
                <button onClick={addYes}>
                <span className="pink">&#60;</span>
                <span className="red">Click Here for Yes&#47;</span>
                <span className="pink">&#62;</span>
                </button>

                <button onClick={addNo}>
                <span className="pink">&#60;</span>
                <span className="red">Click Here for No&#47;</span>
                <span className="pink">&#62;</span>
                </button>
            </div>

            <div>
              <button onClick={fetchData}>
                <span className="pink">&#60;</span>
                <span className="red">Fetch Data&#47;</span>
                <span className="pink">&#62;</span>
              </button>
            </div>
            {commentHidden ? (
            <div id="results">
              <span className="gray">
              &#47;&#47; {yesPercentage}&#37; voted 'Yes', while {noPercentage}&#37; voted 'No'
              </span>
            </div>
            ) : (<div></div>)
            }

          </div>
        </div>
      </div>
    </>
  )
}

export default App
