import * as Calendar from 'expo-calendar';
export async function addProposalToCalendar(proposal: {
  kind: string;
  date: string;
  time: string;
  location: string;
  songs: string[];
}) {
  const startDate = new Date(`${proposal.date} ${proposal.time}`);
  if (Number.isNaN(startDate.getTime()))
    throw new Error('This session date cannot be added automatically.');
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  await Calendar.createEventInCalendarAsync({
    title: `Delos ${proposal.kind}`,
    startDate,
    endDate,
    location: proposal.location,
    notes: `Three-song set: ${proposal.songs.join(', ')}`,
  });
}
