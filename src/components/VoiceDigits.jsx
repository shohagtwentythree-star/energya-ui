import React, { useState, useRef } from 'react';

const VoicePlateEntry = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState("");
  const [partial, setPartial] = useState("");
  
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const streamRef = useRef(null);

  const startRecording = async () => {
    setResult("");
    setPartial("");

    // 1. Connect to Vosk Backend (Update IP if not running on localhost)
    socketRef.current = new WebSocket('ws://localhost:2700');

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Matches the "type" keys we set in the Node.js server
      if (data.type === 'FINAL') {
        // Appends the final phrase to the result
        setResult((prev) => (prev + " " + data.text).trim());
        setPartial("");
      } else if (data.type === 'PARTIAL') {
        setPartial(data.text);
      }
    };

    socketRef.current.onerror = (err) => console.error("WebSocket Error:", err);

    // 2. Setup Audio Processing
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Vosk expects 16000Hz Mono
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
      });

      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Buffer size 4096 is standard; 1 input channel, 1 output channel
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      processorRef.current.onaudioprocess = (e) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Convert Float32 (Browser) to Int16 (Vosk/Server)
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            // Clamp value between -1 and 1 then scale to 16-bit range
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          socketRef.current.send(pcmData.buffer);
        }
      };

      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied or AudioContext error:", err);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current.onaudioprocess = null;
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
    }
    if (socketRef.current) {
        socketRef.current.close();
    }
  };

  return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui' }}>
      <h1>License Plate Voice Entry</h1>
      <p>Speak digits or letters (e.g., "Alpha 1 2 Dash 5")</p>
      
      <div style={{ margin: '30px 0' }}>
        <button 
          onClick={isRecording ? stopRecording : startRecording}
          style={{
            padding: '20px 40px',
            fontSize: '20px',
            fontWeight: 'bold',
            backgroundColor: isRecording ? '#d32f2f' : '#2e7d32',
            color: 'white',
            border: 'none',
            borderRadius: '50px',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}
        >
          {isRecording ? '🛑 STOP RECORDING' : '🎤 START RECORDING'}
        </button>
      </div>

      <div style={{ 
        background: '#f4f4f4', 
        padding: '20px', 
        borderRadius: '12px',
        minHeight: '150px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <p style={{ color: '#666', fontStyle: 'italic', marginBottom: '10px' }}>
          Listening for: {partial || "..."}
        </p>
        <h2 style={{ fontSize: '32px', textTransform: 'uppercase', letterSpacing: '4px', margin: 0 }}>
          {result || "AWAITING INPUT"}
        </h2>
      </div>

      {result && !isRecording && (
        <button 
          onClick={() => alert(`Saving plate: ${result}`)}
          style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}
        >
          Save to Database
        </button>
      )}
    </div>
  );
};

export default VoicePlateEntry;
