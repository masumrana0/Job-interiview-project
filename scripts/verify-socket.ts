import { io as ioClient, Socket } from 'socket.io-client';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

interface Slot {
  id: string;
  startsAt: string;
  endsAt: string;
}

interface BookingResponse {
  booking: {
    id: string;
    slotId: string;
    customerName: string;
    customerEmail: string;
    status: string;
  };
}

interface SocketEvent {
  event: string;
  payload: any;
  receivedAt: string;
}

async function runSocketVerification() {
  console.log('====================================================');
  console.log('⚡ Socket.IO Frontend-Free Realtime Verification');
  console.log(`Connecting to: ${API_BASE_URL} (path: /socket.io)`);
  console.log('====================================================\n');

  const receivedEvents: SocketEvent[] = [];

  const socket: Socket = ioClient(API_BASE_URL, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    timeout: 5000
  });

  await new Promise<void>((resolve, reject) => {
    socket.on('connect', () => {
      console.log(`✅ [Socket.IO] Connected successfully with socket ID: ${socket.id}`);
      resolve();
    });

    socket.on('connect_error', (err) => {
      reject(new Error(`Failed to connect to Socket.IO server: ${err.message}`));
    });

    setTimeout(() => {
      reject(new Error('Connection timeout waiting for Socket.IO connect event.'));
    }, 5000);
  });

  socket.on('slot.booked', (payload) => {
    console.log('📥 [Event Received: slot.booked]:', JSON.stringify(payload, null, 2));
    receivedEvents.push({ event: 'slot.booked', payload, receivedAt: new Date().toISOString() });
  });

  socket.on('slot.released', (payload) => {
    console.log('📥 [Event Received: slot.released]:', JSON.stringify(payload, null, 2));
    receivedEvents.push({ event: 'slot.released', payload, receivedAt: new Date().toISOString() });
  });

  // Step 1: Query GET /slots to find an available slot
  console.log('\n🔍 Step 1: Fetching available slots from GET /slots...');
  const slotsRes = await fetch(`${API_BASE_URL}/slots`);
  if (!slotsRes.ok) {
    throw new Error(`GET /slots returned status ${slotsRes.status}`);
  }
  const { slots } = (await slotsRes.json()) as { slots: Slot[] };
  if (!slots || slots.length === 0) {
    throw new Error('No available slots found. Please run seed script first: npm run seed');
  }

  const targetSlot = slots[0];
  console.log(`Targeting available slot: ${targetSlot.id} (${targetSlot.startsAt} - ${targetSlot.endsAt})`);

  // Step 2: Book the slot via POST /bookings
  console.log('\n📝 Step 2: Sending POST /bookings...');
  const initialEventCount = receivedEvents.length;

  const bookRes = await fetch(`${API_BASE_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slotId: targetSlot.id,
      customerName: 'Socket Tester',
      customerEmail: 'socket.tester@example.com'
    })
  });

  if (bookRes.status !== 201) {
    const errorBody = await bookRes.text();
    throw new Error(`Expected 201 Created from POST /bookings, got ${bookRes.status}: ${errorBody}`);
  }

  const bookData = (await bookRes.json()) as BookingResponse;
  const createdBooking = bookData.booking;
  console.log(`Booking created successfully: ${createdBooking.id} (Status: ${createdBooking.status})`);

  // Wait for socket event delivery
  await new Promise((r) => setTimeout(r, 600));

  const bookedEvent = receivedEvents.find(
    (e) => e.event === 'slot.booked' && e.payload.bookingId === createdBooking.id
  );

  if (!bookedEvent) {
    throw new Error('❌ slot.booked event was NOT received on Socket.IO!');
  }

  if (
    bookedEvent.payload.slotId !== targetSlot.id ||
    bookedEvent.payload.available !== false ||
    'customerName' in bookedEvent.payload ||
    'customerEmail' in bookedEvent.payload
  ) {
    throw new Error('❌ slot.booked event payload structure violates specification!');
  }
  console.log('✅ slot.booked verified: payload format and privacy constraints satisfied.');

  // Step 3: Cancel the booking via DELETE /bookings/:id
  console.log('\n🗑️ Step 3: Cancelling booking via DELETE /bookings/' + createdBooking.id + '...');
  const cancelRes = await fetch(`${API_BASE_URL}/bookings/${createdBooking.id}`, {
    method: 'DELETE'
  });

  if (cancelRes.status !== 200) {
    const errorBody = await cancelRes.text();
    throw new Error(`Expected 200 OK from DELETE /bookings, got ${cancelRes.status}: ${errorBody}`);
  }

  await new Promise((r) => setTimeout(r, 600));

  const releasedEvent = receivedEvents.find(
    (e) => e.event === 'slot.released' && e.payload.bookingId === createdBooking.id
  );

  if (!releasedEvent) {
    throw new Error('❌ slot.released event was NOT received on Socket.IO!');
  }

  if (
    releasedEvent.payload.slotId !== targetSlot.id ||
    releasedEvent.payload.available !== true ||
    'customerName' in releasedEvent.payload
  ) {
    throw new Error('❌ slot.released event payload structure violates specification!');
  }
  console.log('✅ slot.released verified: payload format and privacy constraints satisfied.');

  // Step 4: Repeated cancellation (Idempotency check)
  console.log('\n🔁 Step 4: Testing repeated cancellation (idempotency check)...');
  const countBeforeRepeat = receivedEvents.length;

  const repeatCancelRes = await fetch(`${API_BASE_URL}/bookings/${createdBooking.id}`, {
    method: 'DELETE'
  });

  if (repeatCancelRes.status !== 200) {
    throw new Error(`Repeated cancellation expected 200, got ${repeatCancelRes.status}`);
  }

  await new Promise((r) => setTimeout(r, 600));

  if (receivedEvents.length > countBeforeRepeat) {
    throw new Error('❌ Repeated cancellation emitted an unrequested duplicate socket event!');
  }
  console.log('✅ Idempotency verified: repeated cancellation returned 200 with 0 duplicate socket events.');

  // Cleanup
  socket.disconnect();
  console.log('\n====================================================');
  console.log('🎉 ALL SOCKET.IO REALTIME VERIFICATIONS PASSED 100%');
  console.log('====================================================');
  process.exit(0);
}

runSocketVerification().catch((err) => {
  console.error('\n❌ Socket.IO Verification Failed:', err.message);
  process.exit(1);
});
