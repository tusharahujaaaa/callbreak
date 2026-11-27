// The latest state from the server, plus a little client-only UI state.
export const store = {
  state: null, // room view sent by the server (null = home screen)
  busy: false, // a bid/play has been sent and we're waiting for the server
};

// Which seat position (0 bottom, 1 left, 2 top, 3 right) a seat is drawn at.
export const rel = (seat) => (seat - store.state.mySeat + 4) % 4;

export const seatName = (i) => (i === store.state.mySeat ? 'You' : store.state.seats[i].name);
