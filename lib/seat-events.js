function emitTripEvent(tripId, event, data) {
  if (global.io) global.io.to(`trip:${tripId}`).emit(event, data);
}

module.exports = { emitTripEvent };
