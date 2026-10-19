export const STATUSES = Object.freeze(['Received', 'Preparing', 'Ready for Pickup', 'Completed']);

export function nextStatus(current) {
  const index = STATUSES.indexOf(current);
  return index < 0 || index === STATUSES.length - 1 ? null : STATUSES[index + 1];
}

export function updateStatus(order, proposedStatus) {
  if (!order || !order.id) throw new Error('Invalid order');
  if (nextStatus(order.status) !== proposedStatus) {
    throw new Error(`Invalid status transition: ${order.status} → ${proposedStatus}`);
  }
  return {...order, status: proposedStatus};
}

export function ordersForRestaurant(orders, restaurantId) {
  return orders.filter(o => o.restaurantId === restaurantId)
    .sort((a,b) => new Date(a.pickupTime).getTime() - new Date(b.pickupTime).getTime());
}

export function formatMoney(value) { return new Intl.NumberFormat('en-CA', {style:'currency',currency:'CAD'}).format(value); }
export function orderTotal(order) { return order.items.reduce((sum,item)=>sum + item.price * item.quantity, 0); }
