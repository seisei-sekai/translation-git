import React, { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import './photoOCR.css';

const PhotoOCR = () => {
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [facingMode, setFacingMode] = useState('environment');
  const videoRef = useRef(null);
  const [qrUrl, setQrUrl] = useState('');
  const [qrLocation, setQrLocation] = useState(null);

  const zxingReaderRef = useRef(null);

  useEffect(() => {
    if (isCameraOn) {
      startCamera();
    } else {
      stopCamera();
    }

    let animationFrameId;
    if (isCameraOn) {
      const detectQRCode = async () => {
        if (videoRef.current && videoRef.current.readyState === 4 && !videoRef.current.paused) {
          try {
            if (!zxingReaderRef.current) {
              zxingReaderRef.current = new BrowserMultiFormatReader();
            }
            try {
              const result = await zxingReaderRef.current.decodeOnce(videoRef.current);
              setQrUrl(result.getText());
              // Approximate QR location (center of the video)
              const videoWidth = videoRef.current.videoWidth;
              const videoHeight = videoRef.current.videoHeight;
              setQrLocation({
                x: videoWidth / 2 - 50,
                y: videoHeight / 2 - 50,
                width: 100,
                height: 100
              });
            } catch (error) {
              if (!(error instanceof NotFoundException)) {
                console.error('ZXing QR Code detection failed:', error);
              }
              setQrUrl('');
              setQrLocation(null);
            }
          } catch (error) {
            console.error('QR Code detection failed:', error);
          }
        }
        animationFrameId = requestAnimationFrame(detectQRCode);
      };

      detectQRCode();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (zxingReaderRef.current) {
        zxingReaderRef.current.reset();
      }
    };
  }, [isCameraOn, facingMode]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      if (facingMode === 'environment') {
        setFacingMode('user');
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn);
  };

  const switchCamera = () => {
    setFacingMode(prevMode => prevMode === 'user' ? 'environment' : 'user');
  };

  return (
    <div className="photo-ocr-container">
      {isCameraOn && (
        <div className="camera-container">
          <video ref={videoRef} autoPlay playsInline className="camera-view" />
          {/* {qrLocation && (
            <div 
              className="qr-indicator" 
              style={{
                left: `${qrLocation.x + qrLocation.width / 2}px`,
                top: `${qrLocation.y + qrLocation.height / 2}px`
              }}
            />
          )} */}
        </div>
      )}
      <div className="qr-url-textboxx">
        <input 
          type="text" 
          value={qrUrl} 
          readOnly 
          placeholder="QR Code URL will appear here"
        />
      </div>
      <button className="camera-toggle" onClick={toggleCamera}>
        {isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
      </button>
      <button className="cameraa-switch" onClick={switchCamera}>
        Switch Camera
      </button>
    </div>
  );
};

export default PhotoOCR;
