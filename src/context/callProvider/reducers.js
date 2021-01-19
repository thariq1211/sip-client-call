import actions from "./actions";

export const initialState = {
  callerId: "",
  sipCode: "00",
  sipStatus: "Disconnected",
  isRegistered: false,
  incomingCall: false,
  ongoingCall: false,
  onHold: false
};

export const callReducer = (state, action) => {
  switch (action.type) {
    case actions.CONNECTING:
      return { ...state, sipCode: "01", sipStatus: "Connecting" };
    case actions.CONNECTED:
      return { ...state, sipCode: "02", sipStatus: "Connected" };
    case actions.DISCONNECTED:
      return { ...state, sipCode: "00", sipStatus: "Disconnected" };
    case actions.REGISTERED:
      return {
        ...state,
        sipCode: "03",
        sipStatus: "Registered",
        isRegistered: true
      };
    case actions.UNREGISTERED:
      return {
        ...state,
        sipCode: "05",
        sipStatus: "Unregistered",
        isRegistered: false
      };
    case actions.REGISTERFAILED:
      return { ...state, sipCode: "04", sipStatus: "Register Failed" };
    case actions.REGISTER:
      return { ...state, isRegistered: true };
    case actions.INCOMING_START:
      return { ...state, incomingCall: true };
    case actions.SETCALLER:
      return { ...state, callerId: action.payload };
    case actions.ACCEPT_CALL:
      return { ...state, incomingCall: false, ongoingCall: true };
    case actions.DECLINE_CALL:
      return { ...state, incomingCall: false };
    case actions.END_CALL:
      return { ...state, ongoingCall: false };
    case actions.TOGGLE_HOLD: {
      const currentHold = state.onHold;
      return { ...state, onHold: !currentHold };
    }
    case actions.INCOMING_END:
    case actions.SIGN_OUT:
    default:
      return initialState;
  }
};
