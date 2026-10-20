// Sample audience profiles used for the "Preview as" dropdown.
// Variable maps include both snake_case and camelCase variants of common
// personalization keys so they line up with whatever the doc happens to use.

export type ProfileSample = {
  id: string;
  name: string;
  description: string;
  vars: Record<string, string>;
};

function makeVars(input: {
  first: string;
  last: string;
  city: string;
  country: string;
  tier: string;
  email: string;
}): Record<string, string> {
  const full = `${input.first} ${input.last}`;
  return {
    first_name: input.first,
    firstName: input.first,
    last_name: input.last,
    lastName: input.last,
    full_name: full,
    fullName: full,
    name: full,
    city: input.city,
    country: input.country,
    tier: input.tier,
    email: input.email,
  };
}

export const PROFILE_SAMPLES: ProfileSample[] = [
  {
    id: "ava",
    name: "Ava Chen",
    description: "San Francisco · Silver tier",
    vars: makeVars({
      first: "Ava",
      last: "Chen",
      city: "San Francisco",
      country: "USA",
      tier: "Silver",
      email: "ava.chen@example.com",
    }),
  },
  {
    id: "lukas",
    name: "Lukas Bauer",
    description: "Berlin · Gold tier",
    vars: makeVars({
      first: "Lukas",
      last: "Bauer",
      city: "Berlin",
      country: "Germany",
      tier: "Gold",
      email: "lukas.bauer@example.com",
    }),
  },
  {
    id: "mei",
    name: "Mei Tanaka",
    description: "Tokyo · new customer",
    vars: makeVars({
      first: "Mei",
      last: "Tanaka",
      city: "Tokyo",
      country: "Japan",
      tier: "Bronze",
      email: "mei.tanaka@example.com",
    }),
  },
  {
    id: "samir",
    name: "Samir Patel",
    description: "Mumbai · Platinum VIP",
    vars: makeVars({
      first: "Samir",
      last: "Patel",
      city: "Mumbai",
      country: "India",
      tier: "Platinum",
      email: "samir.patel@example.com",
    }),
  },
];

export function getProfile(id: string): ProfileSample | undefined {
  return PROFILE_SAMPLES.find((p) => p.id === id);
}
