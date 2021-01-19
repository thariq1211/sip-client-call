/* eslint-disable no-use-before-define */
/* eslint-disable no-unused-vars */
import React, { useEffect, useReducer, useRef, useState } from "react";
import { node } from "prop-types";
import JsSIP from "jssip";
import Cookie from "js-cookie";

import actions from "./actions";
import { callReducer, initialState } from "./reducers";

import ringtone from "../../assets/incoming_call.mp3";

export const CallContext = React.createContext();

const CallProvider = ({ children }) => {
  const url = "iswitch.ddns.net";
  let socket = "";
  let configuration = {};
  let rtcSession;
  let callSession;
  const incomingCallRingTone = new Audio(ringtone);
  incomingCallRingTone.loop = true;
  const [state, dispatch] = useReducer(callReducer, initialState);
  const { ongoingCall, isRegistered } = state;
  const [params, setParams] = useState();
  const [rtcSessionState, updateRtcSession] = useState();
  const [sessionCallState, updateCallSession] = useState();
  const [mediaStreamObj, updateMediaObj] = useState();

  const chunksRef = useRef();
  const recordRef = useRef();
  const mediaObjRef = useRef();

  const extension = params ? params.extension : undefined;
  const password = params ? params.password : undefined;

  if (extension) sessionStorage.setItem("extension_user", extension);

  const initJsSIP = () => {
    JsSIP.debug.enable("JsSIP:WebSocketInterface");
    JsSIP.debug.enable("JsSIP:Transport");
    socket = new JsSIP.WebSocketInterface("wss://iswitch.ddns.net:8089/ws");
    configuration = {
      sockets: [socket],
      uri: `sip:${extension}@${url}`,
      password
    };
    rtcSession = new JsSIP.UA(configuration);
    updateRtcSession(rtcSession);

    rtcSession.on("newRTCSession", data => {
      console.log("RTC SESSION START");
      dispatch({ type: actions.REGISTER });
      callSession = data.session;
      updateCallSession(data.session);

      if (callSession.direction === "incoming") {
        console.log("[Event Incoming]");
        incomingCallRingTone.play();
        /**
         * @TODO Fix redundant logic
         */
        const callerId = data.request.getHeader("From");
        const temp = callerId.substring(
          callerId.indexOf("<sip:") + 5,
          callerId.indexOf("@")
        );

        const temp2 = callerId.substring(
          callerId.indexOf("-"),
          callerId.indexOf("@")
        );
        const extensionCaller = temp.substring(0, temp.indexOf("*"));
        const uniqueId = temp.substring(temp.indexOf("*") + 1);
        dispatch({ type: actions.SETCALLER, payload: temp });
        Cookie.set("extension", extensionCaller);
        dispatch({ type: actions.INCOMING_START });

        // incoming call here

        /* On accept incoming call */
        callSession.on("accepted", acceptedCall);

        callSession.on("confirmed", () => {
          console.log("[CALL CONFIRMED]");
          handleSession(callSession);
          const recorder = new Recording(callSession);
          recordRef.current = recorder;
          recorder.startRecording();
          // this handler will be called for incoming calls too
        });

        callSession.on("hold", holdSession);

        callSession.on("unhold", unholdSession);

        /* On end ongoing call */
        callSession.on("ended", () => {
          console.log("[Call ended]");
          videoCallStop();
        });

        /**
         * On call failed
         * call was canceled by the caller
         */
        callSession.on("failed", failedCall);
      }
    });

    rtcSession.on("connecting", _data => {
      dispatch({ type: actions.CONNECTING });
      console.log("sip connecting");
    });

    rtcSession.on("connected", _data => {
      dispatch({ type: actions.CONNECTED });
      console.log("connected");
    });

    rtcSession.on("disconnected", _data => {
      dispatch({ type: actions.DISCONNECTED });
      console.log("disconnected");
    });

    rtcSession.on("registered", cb => {
      dispatch({ type: actions.REGISTERED });
      const { data, status_code } = cb.response;
      console.log(`registered ${data} ${status_code}`);
    });

    rtcSession.on("unregistered", cb => {
      dispatch({ type: actions.UNREGISTERED });
      const { data, status_code } = cb.response;
      console.log(`unregister ${data} ${status_code}`);
    });

    rtcSession.on("registrationFailed", cb => {
      dispatch({ type: actions.REGISTERFAILED });
      const { data, status_code } = cb.response;
      console.log(`unregister failed ${cb.cause} ${data} ${status_code}`);
    });

    // rtcSession.start();
  };

  /**
   * LIST SIP HANDLE FUNCTION
   */

  const holdSession = () => {
    console.log("[Hold call]");
    dispatch({ type: actions.TOGGLE_HOLD });
  };

  const unholdSession = () => {
    console.log("[Unhold call]");
    dispatch({ type: actions.TOGGLE_HOLD });
  };

  const failedCall = () => {
    // unable to establish the call
    console.log("[FAILED CALL]");
    Cookie.remove("extension");
    Cookie.remove("ts");
    incomingCallRingTone.pause();
    dispatch({ type: actions.DECLINE_CALL });
  };

  const handleRemoteStream = (stream, uivideo) => {
    console.log("[Handle Remote Stream]");
    // console.log(stream.getVideoTracks.length);

    if ("srcObject" in uivideo) {
      uivideo.srcObject = stream;
    } else {
      uivideo.src = URL.createObjectURL(stream);
    }

    stream.addEventListener("addtrack", event => {
      const { track } = event;

      if (uivideo.srcObject !== stream) return;

      console.log('[remote stream "addtrack" event]');
      // Refresh remote video
      if ("srcObject" in uivideo) {
        uivideo.srcObject = stream;
      } else {
        uivideo.src = URL.createObjectURL(stream);
      }

      track.addEventListener("ended", () => {
        console.log(`[remote track "ended" event track: ${track}]`);
        // JsSIP.Utils.closeMediaStream(stream);
      });
    });
    stream.addEventListener("removetrack", () => {
      if (uivideo.srcObject !== stream) return;
      // Refresh remote video
      if ("srcObject" in uivideo) {
        uivideo.srcObject = stream;
      } else {
        uivideo.src = URL.createObjectURL(stream);
      }
    });
  };

  const handleSession = session => {
    const peerConnection = session.connection;
    const selfView = document.getElementById("selfView");
    const remoteView = document.getElementById("remoteView");
    const localStream = peerConnection.getLocalStreams()[0];
    const remoteStream = peerConnection.getRemoteStreams()[0];
    let localClonedStream = null;
    console.log("[Handle Session Call]");

    if (localStream) {
      localClonedStream = localStream.clone();
      // console.log(localClonedStream);

      if ("srcObject" in selfView) {
        selfView.srcObject = localClonedStream;
      } else {
        selfView.src = URL.createObjectURL(localClonedStream);
      }
    }
    if (remoteStream) {
      handleRemoteStream(remoteStream, remoteView);
    }
    session.on("ended", _data => {
      console.log("[Session Ended]");
      JsSIP.Utils.closeMediaStream(localClonedStream);
    });
    peerConnection.addEventListener("addstream", event => {
      console.log('peerconnection "addstream" event');
      // addLog('peerconnection "addstream" event');
      handleRemoteStream(event.stream, remoteView);
    });
  };

  const videoCallStop = () => {
    const selfView = document.getElementById("selfView");
    const remoteView = document.getElementById("remoteView");

    // selfView.pause();
    // selfView.removeAttribute("src"); // empty source
    // selfView.load();

    // remoteView.pause();
    // remoteView.removeAttribute("src"); // empty source
    // remoteView.load();

    // deleteExt(Cookie.get("extension"));
    dispatch({ type: actions.END_CALL });
  };

  const downloadFile = (blob, filename) => {
    try {
      const hLink = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = hLink;
      a.download = filename;
      a.click();
    } catch (error) {
      console.error(error.message);
    }
  };

  const getDate = () => {
    const newDate = new Date()
      .toString()
      .split(" ")
      .slice(1, 5);
    const months = {
      Jan: "01",
      Feb: "02",
      Mar: "03",
      Apr: "04",
      May: "05",
      Jun: "06",
      Jul: "07",
      Aug: "08",
      Sep: "09",
      Oct: "10",
      Nov: "11",
      Dec: "12"
    };
    newDate[0] = months[newDate[0]];
    [newDate[0], newDate[1], newDate[2]] = [newDate[2], newDate[0], newDate[1]];
    const time1 = newDate[3];
    const time2 = time1
      .split(":")
      .slice(0, 2)
      .join("");
    return newDate.slice(0, 3).join("");
  };

  function MixAudioStreams(MultiAudioTackStream) {
    // Takes in a MediaStream with any mumber of audio tracks and mixes them together

    let audioContext = null;
    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContext = new AudioContext();
    } catch (e) {
      console.warn("AudioContext() not available, cannot record");
      return MultiAudioTackStream;
    }
    const mixedAudioStream = audioContext.createMediaStreamDestination();
    MultiAudioTackStream.getAudioTracks().forEach(function(audioTrack) {
      const srcStream = new MediaStream();
      srcStream.addTrack(audioTrack);
      const streamSourceNode = audioContext.createMediaStreamSource(srcStream);
      streamSourceNode.connect(mixedAudioStream);
    });

    return mixedAudioStream.stream;
  }

  function Recording(session) {
    chunksRef.current = [];
    const localStream = session.connection.getLocalStreams()[0];
    const remoteStream = session.connection.getRemoteStreams()[0];
    const audioLocal = localStream.getAudioTracks()[0];
    const audioRemote = remoteStream.getAudioTracks()[0];
    let options = { mimeType: "video/webm;codecs=vp8,opus" };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      console.error(`${options.mimeType} is not supported`);
      options = { mimeType: "video/webm;codecs=vp8,opus" };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        console.error(`${options.mimeType} is not supported`);
        options = { mimeType: "video/webm" };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          console.error(`${options.mimeType} is not supported`);
          options = { mimeType: "" };
        }
      }
    }

    const audioStream = new MediaStream();
    audioStream.addTrack(audioRemote);
    audioStream.addTrack(audioLocal);

    const mediaStream = new MediaStream([
      mediaObjRef.current.getVideoTracks()[0],
      MixAudioStreams(audioStream).getAudioTracks()[0]
    ]);
    const mediaRecord = new MediaRecorder(mediaStream, options);

    this.startRecording = function() {
      try {
        mediaRecord.start();
      } catch (error) {
        console.error(error.message);
      }
    };
    this.stopRecording = function() {
      try {
        mediaRecord.stop();
      } catch (error) {
        console.error(error.message);
      }
    };
    mediaRecord.ondataavailable = ev => {
      console.log(`Push data`);
      // console.log(ev.data);
      chunksRef.current.push(ev.data);
    };

    mediaRecord.onerror = e => {
      console.log("error");
      console.log(e);
    };
    mediaRecord.onstart = () => {
      console.log(`Recording started`);
    };
    mediaRecord.onstop = ev => {
      console.log(`Recording stopped`);
      console.log(chunksRef.current);
      const blob = new Blob(chunksRef.current, { type: "video/mp4" });
      const out = Cookie.get("out");
      const agent = sessionStorage.getItem("extension_user");
      const client = Cookie.get("extension");
      const filename =
        out === "true"
          ? `OUT-AGENT${agent}-CLIENT${client}-${getDate()}`
          : `IN-AGENT${agent}-CLIENT${client}-${getDate()}`;
      downloadFile(blob, `${filename}.mp4`);
      chunksRef.current = [];
    };
  }

  const stopCapture = _evt => {
    const videoElem = document.getElementById("recordingVideo");
    try {
      const tracks = videoElem.srcObject.getTracks();

      tracks.forEach(track => track.stop());
      videoElem.srcObject = null;
    } catch (error) {
      console.error(error.message);
    }
  };

  /**
   * LIST SIP FUNCTION
   */

  const acceptedCall = () => {
    console.log("[CALL ACCEPTED]");
    incomingCallRingTone.pause();

    // GET EXTENTION USER ID
    dispatch({ type: actions.ACCEPT_CALL });
  };

  const holdCall = () => {
    if (sessionCallState && sessionCallState.hold) sessionCallState.hold();
  };

  const unholdCall = () => {
    if (sessionCallState && sessionCallState.unhold) sessionCallState.unhold();
  };

  const acceptCall = () => {
    const callOptions = {
      mediaConstraints: {
        audio: true,
        video: true
      },
      pcConfig: {
        iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }]
      }
    };

    if (sessionCallState && sessionCallState.answer) {
      sessionCallState.answer(callOptions);
    }
  };

  const rejectCall = () => {
    if (sessionCallState && sessionCallState.terminate)
      sessionCallState.terminate();
    dispatch({ type: actions.DECLINE_CALL });
  };

  const referCall = () => {
    if (sessionCallState) sessionCallState.sendDTMF("#1");
  };

  const sendTone = tones => {
    if (sessionCallState && sessionCallState.sendDTMF)
      sessionCallState.sendDTMF(tones);
    dispatch({ type: actions.TRANSFER_CALL });
  };

  const referCallExt = ext => {
    const options = {
      eventHandlers: {
        requestSucceeded(e) {
          console.log(`[requestSucceeded] ${e}`);
          /** saat mencoba call dengan sukses (extension aktif) akan berjalan */
        },
        requestFailed(e) {
          console.log(`[requestFailed] ${e}`);
          /** saat mencoba call gagal (extension nonaktif / tidak teregister) akan berjalan */
          setTimeout(() => {
            videoCallStop();
          }, 1000);
        },
        trying(e) {
          console.log(`[trying] ${e}`);
          /** setelah requestSucceeded akan dijalankan */
        },
        progress(e) {
          console.log(`[progress] ${e}`);
          /** setelah trying akan dijalankan */
        },
        accepted(e) {
          console.log(`[accepted] ${e}`);
          /** setelah tujuan answer call akan dijalankan */
          setTimeout(() => {
            videoCallStop();
          }, 1000);
        },
        failed(e) {
          console.log(`[failed] ${e}`);
          /** setelah tujuan reject call akan dijalankan */
          setTimeout(() => {
            videoCallStop();
          }, 1000);
        }
      }
    };

    if (sessionCallState) sessionCallState.refer(ext, options);
    setTimeout(() => {
      videoCallStop();
    }, 2000);
    dispatch({ type: actions.TRANSFER_CALL });
  };

  const endCall = () => {
    if (sessionCallState && sessionCallState.terminate)
      sessionCallState.terminate();
  };

  const registerSip = () => {
    rtcSessionState.start();
  };

  const unregisterSip = () => {
    rtcSessionState.stop();
  };

  useEffect(() => {
    if (recordRef.current && !ongoingCall) {
      recordRef.current.stopRecording();
    } else {
      console.log("Recording not started yet!");
    }
  }, [ongoingCall]);

  useEffect(() => {
    if (extension && password) initJsSIP();
  }, [extension, password]);

  useEffect(() => {
    if (isRegistered) {
      stopCapture();
      if (
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia
      ) {
        const constraintObj = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          },
          video: { mediaSource: "screen" }
        };

        navigator.mediaDevices
          .getDisplayMedia(constraintObj)
          .then(stream => {
            const video = document.getElementById("recordingVideo");

            if ("srcObject" in video) {
              video.srcObject = stream;
            } else {
              video.src = window.URL.createObjectURL(stream);
            }
            updateMediaObj(stream);
            mediaObjRef.current = stream;
          })
          .catch(error => {
            alert("Error accessing media devices.", error.message);
            (function handleError(constrain) {
              navigator.mediaDevices
                .getDisplayMedia(constrain)
                .then(stream => {
                  const video = document.querySelector("video");

                  if ("srcObject" in video) {
                    video.srcObject = stream;
                  } else {
                    video.src = window.URL.createObjectURL(stream);
                  }
                  updateMediaObj(stream);
                  mediaObjRef.current = stream;
                })
                .catch(_error => {
                  alert("Error accessing media devices.", _error.message);
                  handleError(constraintObj);
                });
            })();
          });
      } else {
        console.error("BROWSER NOT SUPPORTED");
      }
    } else {
      stopCapture();
    }
  }, [isRegistered]);

  const exported = {
    params,
    setParams,
    callState: state,
    registerSip,
    unregisterSip,
    acceptCall,
    referCallExt,
    referCall,
    sendTone,
    holdCall,
    unholdCall,
    rejectCall,
    endCall
  };

  return (
    <CallContext.Provider value={exported}>{children}</CallContext.Provider>
  );
};

CallProvider.propTypes = {
  children: node.isRequired
};

export default CallProvider;
