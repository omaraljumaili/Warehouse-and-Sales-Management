/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';
import { translations } from '../translations';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
  lang: 'en' | 'ar';
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose, lang }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const t = translations[lang];

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "barcode-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );
    
    scanner.render((decodedText) => {
      onScan(decodedText);
      scanner.clear().catch(console.error);
    }, (error) => {
      // quiet fail
    });

    scannerRef.current = scanner;

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
      <div className="w-full max-w-lg bg-white rounded-[32px] overflow-hidden shadow-2xl border border-gray-100 italic">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-apple-dark-blue">
            {t.barcode.scan}
          </h3>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-white transition-all"
          >
            <X size={16} />
          </button>
        </div>
        <div id="barcode-reader" className="w-full" />
        <div className="p-4 flex justify-center">
          <p className="text-[10px] uppercase font-black tracking-widest text-apple-gray animate-pulse">
            {t.barcode.align}
          </p>
        </div>
      </div>
    </div>
  );
};
