import { PhantomProvider } from "../types"

const getProvider = () => {

    // - Check if the provider is Phantom Wallet or if 
    //   Phantom wallet exists.
    if ('phantom' in window) {
        const anyWindow: any = window
        const provider = anyWindow.phantom.solana
        
        if (provider.isPhantom) {
            return provider
        }
    }

    // - Open the Phantom Wallet website if there are no
    //   Phantom Wallet extension installed.
    window.open('https://phantom.app/', '_blank')
}

export default getProvider