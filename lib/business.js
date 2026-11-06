function calculateRefund(totalAmount, departureTime, now = new Date()) {
  const hoursUntilDeparture = (new Date(departureTime).getTime() - now.getTime()) / 3600000;
  const percent = hoursUntilDeparture > 24 ? 90 : hoursUntilDeparture >= 3 ? 50 : 0;
  return {
    percent,
    amount: Math.floor(Number(totalAmount) * percent / 100)
  };
}

module.exports = { calculateRefund };
