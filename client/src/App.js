import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer";

const queryParams = new URLSearchParams(window.location.search);
const roomId = queryParams.get("room") || "default-room";

function App() {
  const myVideoRef = useRef(null);
  const userVideoRef = useRef(null);
  const socketRef = useRef();
  const peerRef = useRef();
  const streamRef = useRef();

  const [error, setError] = useState(null);

  useEffect(() => {
    // Connect to signaling server
    socketRef.current = io("http://localhost:5000");
    console.log("🔌 Connected to signaling server");

    // Get media stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        streamRef.current = stream;
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
        }

        // Join room
        console.log("📨 Joining room:", roomId);
        socketRef.current.emit("join-room", roomId);

        // When someone joins
        socketRef.current.on("user-joined", (userId) => {
          console.log("✅ A user joined:", userId);
          const peer = createPeer(userId, stream);
          peerRef.current = peer;
        });

        // When signal is received
        socketRef.current.on("signal", ({ from, signal }) => {
          console.log("📡 Signal received from:", from);
          if (!peerRef.current) {
            const peer = addPeer(from, signal, stream);
            peerRef.current = peer;
          } else {
            peerRef.current.signal(signal);
          }
        });

      })
      .catch((err) => {
        setError("❌ Unable to access camera/mic: " + err.message);
        console.error(err);
      });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (peerRef.current) peerRef.current.destroy();
    };
  }, []);

  function createPeer(userId, stream) {
    const peer = new Peer({ initiator: true, trickle: false, stream });

    peer.on("signal", (signal) => {
      console.log("📤 Sending signal to:", userId);
      socketRef.current.emit("signal", { to: userId, signal });
    });

    peer.on("stream", (remoteStream) => {
      console.log("📺 Receiving remote stream");
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = remoteStream;
      }
    });

    return peer;
  }

  function addPeer(userId, incomingSignal, stream) {
    const peer = new Peer({ initiator: false, trickle: false, stream });

    peer.on("signal", (signal) => {
      console.log("📤 Returning signal to:", userId);
      socketRef.current.emit("signal", { to: userId, signal });
    });

    peer.on("stream", (remoteStream) => {
      console.log("📺 Receiving remote stream (answerer)");
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = remoteStream;
      }
    });

    peer.signal(incomingSignal);
    return peer;
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📹 DevMeet – Peer Video Chat</h2>
      <p>🔗 Room ID: <b>{roomId}</b></p>

      {error ? (
        <p style={{ color: "red" }}>{error}</p>
      ) : (
        <div style={{ display: "flex", gap: "2rem" }}>
          <div>
            <h4>🧍 My Video</h4>
            <video
              ref={myVideoRef}
              autoPlay
              muted
              playsInline
              style={{ width: "300px", border: "2px solid #ccc", borderRadius: "8px" }}
            />
          </div>
          <div>
            <h4>👥 Remote User</h4>
            <video
              ref={userVideoRef}
              autoPlay
              playsInline
              style={{ width: "300px", border: "2px solid #ccc", borderRadius: "8px" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
