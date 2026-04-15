// Simulated TikTok Live comment stream — generates realistic content across violation categories

const CLEAN_COMMENTS = [
  "This dance is amazing! 🔥",
  "Love your content, keep it up!",
  "First comment!! 🎉",
  "The editing on this is insane",
  "How long did this take to make?",
  "Sending good vibes to everyone here ✨",
  "This made my day honestly",
  "New fan here, just subscribed",
  "The lighting in this video is perfect",
  "Okay but the transitions though 😍",
  "This song goes so hard",
  "POV: you found the best creator on TikTok",
  "I can't stop watching this on loop lol",
  "Your energy is everything 💯",
  "Show more of this please!!",
  "This is my new favourite account",
  "I showed this to my whole family",
  "The way you explained that was so clear",
  "Not me crying at a TikTok again",
  "This is peak content right here",
];

const VIOLATING_COMMENTS = [
  // Hate speech
  "People like you are subhuman degenerates",
  "All [group] are inferior and should be removed",
  "You're a racist bigot and everyone knows it",
  "KKK had the right idea fight me",
  // Violence
  "I will find you and hurt you seriously",
  "Someone should shoot people who post this",
  "Kill yourself before you embarrass your family more",
  "This creator deserves to be attacked",
  // Spam / scam
  "Follow back everyone!! F4F guaranteed!! Click here",
  "FREE MONEY dm me fast!! Limited offer ends tonight!!",
  "Sub4Sub!! I sub to everyone who subs to me!! Get rich",
  "OnlyFans link in bio!! Exclusive content!! DM me NOW!!",
  // Adult content
  "Check my profile for explicit NSFW content 18+ only",
  "I have nude photos DM me adults only xxx",
  // Misinformation
  "Fake news!! Mainstream media lies about everything they hide the truth",
  "5G towers are microchip government conspiracy the truth is being suppressed",
  "This is a false flag crisis actor situation wake up people",
  // Borderline (may or may not trigger auto-action)
  "HAAAAAATE this song so much!!!",
  "I CANNOT BELIEVE THIS IS REAL WTF",
  "Click here to see the full video https://bit.ly/xyz123",
  "Everyone needs to DM me right now super important",
];

function generateComment() {
  const allComments = [...CLEAN_COMMENTS, ...VIOLATING_COMMENTS];
  return allComments[Math.floor(Math.random() * allComments.length)];
}

module.exports = { generateComment };
