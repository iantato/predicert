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

  // - Initialization of all the useState variables used in the web-application.
  //   
  //   pubKey, setPubkey -> For setting the text of phantom button to public key,
  //                        it is used along with buttonText.
  //   buttonText, setButtonText -> For setting the text of phantom button, literally.
  //   fetchedData, setFetchedState -> A true or false value that is used to check if
  //                                   the data has already been gathered or not. The
  //                                   true or false value is used a lot in the program.
  //   yesPercentage, setYes -> A counter for the fetched data percentage.
  //   noPercentage, setNo -> A counter for the fetched data percentage.
  //   initialVotes, votes, setVotes -> These variables are used in order to store the
  //                                    fetched data and display them to the interface.
  //
  // @ts-ignore
  const [pubKey, setPubKey] = useState(null)
  const [buttonText, setButtonText] = useState("Connect Phantom Wallet")
  const [fetchedData, setFetchedState] = useState(false)
  
  const [yesPercentage, setYes] = useState(0)
  const [noPercentage, setNo] = useState(0)

  const initialVotes: {}= []
  const [votes, setVotes] = useState(initialVotes)

  // Set the limit of the displayed fetched data.
  const limit = 10

  // - Initialize the Phantom Wallet as well as the AnchorProvider.
  //   This block also includes the parsing of the Program ID along with
  //   the idl.json from the anchor deployment program.
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

  // - Handle connection when the Connect button is clicked.
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
  // - Substrings are used in order to display the public key in
  //   a more compact manner so that it doesn't occupy the whole
  //   screen.
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

  // - Handle add "Yes" message
  async function addYes() {

    // @ts-ignore
    const messageAccount = new web3.Keypair()
    
    // - This handles the creation of the Message Account Public Key or the
    //   PDA's public key.
    const [pda,] = await web3.PublicKey.findProgramAddressSync(
      [anchorProvider.wallet.publicKey.toBuffer()],
      program.programId
    )
    
    // - This whole block creates the transaction in order to create
    //   the PDA itself on the program. (All of these are from idl.json)
    //   
    //   messageAccount -> The PDA Public Key.
    //   signer -> Your Wallet's Public Key.
    //   systemProgram -> The Program ID you deployed through anchor.
    await program.methods.addMessage("Yes").accounts({
      messageAccount: pda,
      signer: anchorProvider.wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    }).rpc()

  }

  // - Handle add "No" message
  async function addNo() {

    // @ts-ignore
    const messageAccount = new web3.Keypair()

    // - This handles the creation of the Message Account Public Key or the
    //   PDA's public key.
    const [pda,] = await web3.PublicKey.findProgramAddressSync(
      [anchorProvider.wallet.publicKey.toBuffer()],
      program.programId
    )
    
    // - This whole block creates the transaction in order to create
    //   the PDA itself on the program. (All of these are from idl.json)
    //   
    //   messageAccount -> The PDA Public Key.
    //   signer -> Your Wallet's Public Key.
    //   systemProgram -> The Program ID you deployed through anchor.
    await program.methods.addMessage("No").accounts({
      messageAccount: pda,
      signer: anchorProvider.wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    }).rpc()
  }

  // - Handles fetching data from the blockchain.
  async function fetchData() {
    
    // - Gets the accounts from the Program ID.
    const programAccounts = await connection.getProgramAccounts(programID)

    // - Initialization of the variables that will be used.
    const total = programAccounts.length
    let yesCounter = 0
    let noCounter = 0

    // - This code block is a loop which stores the Public Key and the message
    //   from the Public Key, wether it's 'yes' or 'no', in the voteList so that
    //   we can display it later.
    // - The loop also calculates the percentage of the amount of people that
    //   votes for yes and no.
    // @ts-ignore
    Promise.all((await connection.getProgramAccounts(programID)).map(async(tx, index) => {
      const messageAccount = program.account.messageAccount.fetch(tx.pubkey)
      const item = {index: 0, pubkey: "", msg: ""}
      
      item["index"] = index
      item["pubkey"] = tx.pubkey.toString()
      .substring(0, 10) + "..." + tx.pubkey.toString().substring(tx.pubkey.toString().length - 10, tx.pubkey.toString().length)
      
      messageAccount.then((msg) => {

        // @ts-ignore
        item["msg"] = msg.msg.toString()

        // @ts-ignore
        setVotes(current => [...current, item])

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

    setFetchedState(true)
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
              <button onClick={fetchData} disabled={fetchedData}>
                <span className="pink">&#60;</span>
                <span className="red">Fetch Data&#47;</span>
                <span className="pink">&#62;</span>
              </button>
            </div>
            {fetchedData ? (
            <div id="results">
              <span className="gray">
              &#47;&#47; {yesPercentage}&#37; voted 'Yes', while {noPercentage}&#37; voted 'No'
              </span>
            </div>
            ) : (<div></div>)
            }

          </div>

          <div id="history">
            
            {!fetchedData ? (
              <h2> <span className="gray"> History </span> </h2>
            ) : (<div> </div>)}

            {/* @ts-ignore */}
            {votes.map((element, index) => {
              if (index < limit) {
                return (
                  <div key={index} className="historyItems">
                    <p><span className="purple">{element.pubkey}</span> voted {element.msg}</p>
                  </div>
                )
              }
            })}
          </div>
        </div>
      </div>
    </>
  )
}

export default App
