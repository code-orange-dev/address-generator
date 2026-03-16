import { useState, useCallback, useEffect } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Copy, RefreshCw, AlertTriangle } from 'lucide-react';
import QRCode from 'qrcode';
import * as elliptic from 'elliptic';
import * as cryptoJS from 'crypto-js';
import baseX from 'base-x';

interface BitcoinAddressData {
  privateKey: string;
  publicKey: string;
  publicKeyHash: string;
  versionedHash: string;
  checksum: string;
  bitcoinAddress: string;
}

const BitcoinAddressGenerator = () => {
  useSeoMeta({
    title: 'Bitcoin Address Generator',
    description: 'Generate Bitcoin addresses with step-by-step visualization of the cryptographic process.',
  });

  const [addressData, setAddressData] = useState<BitcoinAddressData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generateRandomPrivateKey = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  };

  const generateBitcoinAddress = async () => {
    setIsGenerating(true);
    
    try {
      // Step 1: Generate random private key
      const privateKey = generateRandomPrivateKey();

      // Step 2: Initialize elliptic curve for secp256k1
      const ec = new elliptic.ec('secp256k1');
      
      // Step 3: Create key pair from private key
      const keyPair = ec.keyFromPrivate(privateKey);
      
      // Step 4: Get public key (compressed)
      const publicKey = keyPair.getPublic(true, 'hex');
      
      // Step 5: SHA-256 hash of public key
      const sha256Hash1 = cryptoJS.SHA256(cryptoJS.enc.Hex.parse(publicKey));
      
      // Step 6: RIPEMD-160 hash of SHA-256 result
      const ripemd160Hash = cryptoJS.RIPEMD160(sha256Hash1);
      const publicKeyHash = ripemd160Hash.toString(cryptoJS.enc.Hex).toUpperCase();

      // Step 7: Add version byte (0x00 for mainnet P2PKH)
      const versionByte = '00';
      const versionedHash = versionByte + publicKeyHash;

      // Step 8: Generate checksum (double SHA-256)
      const sha256Hash2 = cryptoJS.SHA256(cryptoJS.enc.Hex.parse(versionedHash));
      const sha256Hash3 = cryptoJS.SHA256(sha256Hash2);
      const checksum = sha256Hash3.toString(cryptoJS.enc.Hex).substring(0, 8).toUpperCase();

      // Step 9: Combine versioned hash + checksum
      const finalHex = versionedHash + checksum;

      // Step 10: Base58Check encoding
      const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      const bs58 = baseX(BASE58_ALPHABET);
      
      // Convert hex string to bytes for base58 encoding
      const finalBytes = [];
      for (let i = 0; i < finalHex.length; i += 2) {
        finalBytes.push(parseInt(finalHex.substr(i, 2), 16));
      }
      const bitcoinAddress = bs58.encode(new Uint8Array(finalBytes));

      // Step 11: Generate QR code
      const qrData = `bitcoin:${bitcoinAddress}`;
      const qrUrl = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Step 12: Update state with all data
      const result: BitcoinAddressData = {
        privateKey,
        publicKey: publicKey.toUpperCase(),
        publicKeyHash,
        versionedHash: versionedHash.toUpperCase(),
        checksum,
        bitcoinAddress
      };

      setAddressData(result);
      setQrCodeUrl(qrUrl);
      
    } catch (error) {
      console.error('Error generating Bitcoin address:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Generate initial address on component mount
  useEffect(() => {
    generateBitcoinAddress();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#f7931a' }}>
            Bitcoin Address Generator
          </h1>
          <p className="text-gray-400">
            Generate valid Bitcoin addresses with step-by-step cryptographic visualization
          </p>
        </div>

        {/* Generate Button */}
        <div className="text-center">
          <Button
            onClick={generateBitcoinAddress}
            disabled={isGenerating}
            className="bg-orange-500 hover:bg-orange-600 text-black font-semibold px-8 py-3 text-lg"
            style={{ backgroundColor: '#f7931a' }}
          >
            {isGenerating ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Generate New Address
          </Button>
        </div>

        {/* Security Warning */}
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-orange-400">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-semibold">
                Do NOT use generated keys for real funds. This tool is for educational purposes only.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {addressData ? (
          <div className="grid gap-6">
            {/* Private Key */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg font-mono">Private Key</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Input
                    value={addressData.privateKey}
                    readOnly
                    className="font-mono text-sm bg-gray-900 border-gray-600"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(addressData.privateKey)}
                    className="border-gray-600 hover:bg-gray-700"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  256-bit random number (hexadecimal)
                </p>
              </CardContent>
            </Card>

            {/* Step-by-Step Pipeline */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg">Address Generation Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Step 1: Public Key */}
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-black font-bold text-sm">
                      1
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">Public Key (secp256k1)</h3>
                      <div className="flex items-center space-x-2">
                        <Input
                          value={addressData.publicKey}
                          readOnly
                          className="font-mono text-xs bg-gray-900 border-gray-600"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(addressData.publicKey)}
                          className="border-gray-600 hover:bg-gray-700"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Compressed public key derived from private key
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="w-0.5 h-8 bg-gray-600"></div>
                  </div>

                  {/* Step 2: SHA-256 */}
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-black font-bold text-sm">
                      2
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">SHA-256 Hash</h3>
                      <p className="text-xs text-gray-400">
                        Public key hashed with SHA-256 algorithm
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="w-0.5 h-8 bg-gray-600"></div>
                  </div>

                  {/* Step 3: RIPEMD-160 */}
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-black font-bold text-sm">
                      3
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">RIPEMD-160 Hash</h3>
                      <div className="flex items-center space-x-2">
                        <Input
                          value={addressData.publicKeyHash}
                          readOnly
                          className="font-mono text-xs bg-gray-900 border-gray-600"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(addressData.publicKeyHash)}
                          className="border-gray-600 hover:bg-gray-700"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        160-bit hash of the public key
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="w-0.5 h-8 bg-gray-600"></div>
                  </div>

                  {/* Step 4: Version + Checksum */}
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-black font-bold text-sm">
                      4
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">Version + Checksum</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-gray-400">Versioned Hash (0x00 + RIPEMD-160)</label>
                          <Input
                            value={addressData.versionedHash}
                            readOnly
                            className="font-mono text-xs bg-gray-900 border-gray-600"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400">Checksum (first 4 bytes of double SHA-256)</label>
                          <Input
                            value={addressData.checksum}
                            readOnly
                            className="font-mono text-xs bg-gray-900 border-gray-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="w-0.5 h-8 bg-gray-600"></div>
                  </div>

                  {/* Step 5: Base58Check */}
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-black font-bold text-sm">
                      5
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">Base58Check Encoding</h3>
                      <p className="text-xs text-gray-400">
                        Encoded using Base58 to prevent ambiguity and include checksum
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="w-0.5 h-8 bg-gray-600"></div>
                  </div>

                  {/* Final Result */}
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-black font-bold text-sm">
                      ✓
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">Bitcoin Address</h3>
                      <div className="flex items-center space-x-2">
                        <Input
                          value={addressData.bitcoinAddress}
                          readOnly
                          className="font-mono text-sm bg-gray-900 border-gray-600"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(addressData.bitcoinAddress)}
                          className="border-gray-600 hover:bg-gray-700"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Final P2PKH Bitcoin address (starts with 1)
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* QR Code */}
            {qrCodeUrl && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-lg">QR Code</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center space-y-4">
                    <img
                      src={qrCodeUrl}
                      alt="Bitcoin Address QR Code"
                      className="border-2 border-gray-600 rounded-lg"
                    />
                    <p className="text-sm text-gray-400">
                      Scan this QR code to get the Bitcoin address
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-2 text-gray-400">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <p>Generating Bitcoin address...</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BitcoinAddressGenerator;