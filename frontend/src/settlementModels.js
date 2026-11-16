export const statuses = {
  pending: "Awaiting refund",
  partial: "Refund in progress",
  settled: "Settled",
};

const dollar = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
export const money = (cents) => dollar.format(cents / 100);
