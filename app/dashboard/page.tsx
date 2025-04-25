import HomepageAvatars from './homepage-avatars';

// List of all Rita avatars
const ritaAvatars = [
  { id: 1, src: 'rita-avatars-test/1.png', name: 'Rita 1', prompt: 'friendly talking assistant' },
  { id: 2, src: 'rita-avatars-test/deepspace.png', name: 'Deep Space', prompt: 'friendly talking assistant' },
  { id: 3, src: 'rita-avatars-test/rest_4_crop.png', name: 'Rest 4', prompt: 'friendly talking assistant' },
  { id: 4, src: 'rita-avatars-test/rest_5_square.png', name: 'Rest 5', prompt: 'friendly talking assistant' },
  { id: 5, src: 'rita-avatars-test/rest_8_square.png', name: 'Rest 8', prompt: 'friendly talking assistant' },
  { id: 6, src: 'rita-avatars-test/t13.png', name: 'T13', prompt: 'friendly talking assistant' },
  { id: 7, src: 'rita-avatars-test/tifa_3.png', name: 'Tifa 3', prompt: 'friendly talking assistant' },
  { id: 8, src: 'rita-avatars-test/girl_white.png', name: 'cute girl 1', prompt: 'friendly talking assistant' },
  { id: 9, src: 'rita-avatars-test/girl_red.png', name: 'cute girl 2', prompt: 'friendly talking assistant' },
  { id: 10, src: 'rita-avatars-test/mingren.png', name: 'mingren', prompt: 'friendly talking assistant' },
];

// Define category data for mapping
const categories = [
  { name: "Girl", color: "#7e8dc8" },
  { name: "OC", color: "#837ec8" },
  { name: "BlueArchive", color: "#c8917e" },
  { name: "fanart", color: "#7ec8bb" },
  { name: "VTuber", color: "#c8b87e" },
  { name: "NEWGAME!", color: "#c87e92" },
  { name: "Helltaker", color: "#c8807e" },
  { name: "Ghost", color: "#ba7ec8" },
];

// This function will be called at build time and revalidated every 60 seconds
export async function generateStaticParams() {
  // In the future, you can replace this with your database query
  // const imageUris = await fetchImageUrisFromDatabase();
  // const signedUrls = await Promise.all(imageUris.map(getPresignedUrl));
  
  return {
    props: {
      ritaAvatars,
      categories,
    },
    revalidate: 60, // Revalidate every 60 seconds
  };
}

export default function RitaStreamingPage() {
  return <HomepageAvatars ritaAvatars={ritaAvatars} categories={categories} />;
}