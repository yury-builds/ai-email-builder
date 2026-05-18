import type { EmailDoc } from "./types";

const id = (() => {
  let n = 0;
  return (t: string) => `${t}-tpl-${(++n).toString(36)}`;
})();

// Brand-themed values (logo, button colors, fonts, etc.) come from the active
// theme (lib/themes.ts) — set via `data.root.props.theme` and resolved at render time.
// Templates leave logoUrl / button color / button textColor as empty strings so the
// theme drives them; per-block overrides remain possible when a template needs to
// deviate from theme defaults.
const brand = "The Avocado Studio";
const brandFull = "The Avocado Studio";
const brandAddress = "1421 Valencia St, San Francisco, CA 94110";
const unsubscribeUrl = "https://example.com/unsubscribe";
const defaultTheme = "fresh";

export const templates: { id: string; name: string; description: string; doc: EmailDoc }[] = [
  {
    id: "welcome",
    name: "Welcome",
    description: "Onboarding email for new sign-ups.",
    doc: {
      subject: `Welcome to ${brand} — let's get your kitchen stocked`,
      preheader: "Three steps to your first delivery",
      data: {
        root: { props: { theme: defaultTheme } },
        content: [
          { type: "EmailHeader", props: { id: id("EmailHeader"), logoUrl: "", logoAlt: "", logoWidth: 120, alignment: "center" } },
          {
            type: "EmailHero",
            props: {
              id: id("EmailHero"),
              heading: `Welcome to ${brand} 🌱`,
              subhead: "Real food, thoughtfully sourced. Here's how to get started.",
              imageUrl: "https://placehold.co/600x300?text=Welcome",
              imageAlt: "Welcome",
              alignment: "left",
            },
          },
          {
            type: "EmailText",
            props: { id: id("EmailText"), body: `${brand} brings chef-designed, dietitian-approved meals to your door — built around seasonal, whole-food ingredients. Let's set you up in three quick steps.`, alignment: "left", emphasis: "normal" },
          },
          { type: "EmailDivider", props: { id: id("EmailDivider"), spacing: "default" } },
          {
            type: "EmailColumns",
            props: {
              id: id("EmailColumns"),
              leftImageUrl: "https://placehold.co/300x200?text=Set+preferences",
              leftImageAlt: "Set your preferences",
              leftHeading: "1. Set your preferences",
              leftBody: "Tell us about your dietary preferences and any ingredients to avoid. Takes 60 seconds.",
              rightImageUrl: "https://placehold.co/300x200?text=First+box",
              rightImageAlt: "Pick your first box",
              rightHeading: "2. Pick your first box",
              rightBody: "Browse this week's menu and choose four meals to start. You can swap or skip anytime.",
            },
          },
          {
            type: "EmailText",
            props: { id: id("EmailText"), body: "Once you're set up, your first box ships in two days — fresh, chilled, and ready for the fridge.", alignment: "left", emphasis: "normal" },
          },
          { type: "EmailButton", props: { id: id("EmailButton"), label: "Start your first box", href: "https://example.com/start", alignment: "center", color: "", textColor: "" } },
          {
            type: "EmailFooter",
            props: {
              id: id("EmailFooter"),
              companyName: brandFull,
              address: brandAddress,
              unsubscribeUrl,
              socialLinks: [
                { label: "Instagram", href: "https://instagram.com" },
                { label: "Pinterest", href: "https://pinterest.com" },
              ],
            },
          },
        ],
      },
    },
  },
  {
    id: "re-engagement",
    name: "Re-engagement",
    description: "Win back lapsed customers with what's new.",
    doc: {
      subject: "It's been a while — what's new on the menu",
      preheader: "New seasonal recipes and a welcome-back offer inside",
      data: {
        root: { props: { theme: defaultTheme } },
        content: [
          { type: "EmailHeader", props: { id: id("EmailHeader"), logoUrl: "", logoAlt: "", logoWidth: 120, alignment: "center" } },
          {
            type: "EmailHero",
            props: {
              id: id("EmailHero"),
              heading: "We miss having you at our table",
              subhead: "It's been a few weeks. Here's what's new on the menu — and a welcome-back offer to bring you home.",
              imageUrl: "https://placehold.co/600x300?text=Seasonal+menu",
              imageAlt: "Seasonal menu",
              alignment: "left",
            },
          },
          { type: "EmailDivider", props: { id: id("EmailDivider"), spacing: "default" } },
          {
            type: "EmailText",
            props: { id: id("EmailText"), body: "🌿 What's new this season", alignment: "left", emphasis: "strong" },
          },
          {
            type: "EmailColumns",
            props: {
              id: id("EmailColumns"),
              leftImageUrl: "https://placehold.co/300x200?text=Spring+menu",
              leftImageAlt: "Spring menu",
              leftHeading: "Spring menu",
              leftBody: "Twelve new recipes built around peak-season produce — asparagus, fava beans, strawberries, and more.",
              rightImageUrl: "https://placehold.co/300x200?text=Lighter+packaging",
              rightImageAlt: "Lighter packaging",
              rightHeading: "Lighter packaging",
              rightBody: "Same ingredients, 40% less plastic. Our redesigned boxes are fully home-compostable.",
            },
          },
          { type: "EmailButton", props: { id: id("EmailButton"), label: "See this week's menu", href: "https://example.com/menu", alignment: "center", color: "", textColor: "" } },
          {
            type: "EmailText",
            props: { id: id("EmailText"), body: "Not the right time? No problem — we'll save your favorites so they're ready when you are.", alignment: "left", emphasis: "muted" },
          },
          {
            type: "EmailFooter",
            props: {
              id: id("EmailFooter"),
              companyName: brandFull,
              address: brandAddress,
              unsubscribeUrl,
              socialLinks: [
                { label: "Instagram", href: "https://instagram.com" },
                { label: "Recipes", href: "https://example.com/recipes" },
              ],
            },
          },
        ],
      },
    },
  },
  {
    id: "event-invite",
    name: "Event invite",
    description: "RSVP for a tasting, workshop, or pop-up.",
    doc: {
      subject: "You're invited — Spring Tasting, June 12",
      preheader: "An evening of seasonal dishes, drinks, and conversation",
      data: {
        root: { props: { theme: defaultTheme } },
        content: [
          { type: "EmailHeader", props: { id: id("EmailHeader"), logoUrl: "", logoAlt: "", logoWidth: 120, alignment: "center" } },
          {
            type: "EmailHero",
            props: {
              id: id("EmailHero"),
              heading: "You're invited",
              subhead: "Join us for an evening built around peak-season produce — a five-course tasting, a hands-on workshop with our head chef, and time to swap notes with fellow food lovers.",
              imageUrl: "https://placehold.co/600x300?text=Spring+tasting",
              imageAlt: "Spring tasting",
              alignment: "center",
            },
          },
          {
            type: "EmailColumns",
            props: {
              id: id("EmailColumns"),
              leftImageUrl: "https://placehold.co/300x200?text=Calendar",
              leftImageAlt: "Calendar",
              leftHeading: "📅 Date & time",
              leftBody: "Thursday, June 12\n6:30 – 9:30 PM PDT",
              rightImageUrl: "https://placehold.co/300x200?text=Map",
              rightImageAlt: "Map of venue",
              rightHeading: "📍 Location",
              rightBody: `${brand} Test Kitchen\n${brandAddress}`,
            },
          },
          {
            type: "EmailText",
            props: { id: id("EmailText"), body: "Wine pairings included. Vegetarian, vegan, and gluten-free options available — tell us in the RSVP form and we'll take care of the rest.", alignment: "center", emphasis: "normal" },
          },
          { type: "EmailButton", props: { id: id("EmailButton"), label: "RSVP", href: "https://example.com/events/spring-tasting/rsvp", alignment: "center", color: "", textColor: "" } },
          { type: "EmailDivider", props: { id: id("EmailDivider"), spacing: "default" } },
          {
            type: "EmailText",
            props: { id: id("EmailText"), body: "Can't make it? Reply and we'll send the recipe cards from the night.", alignment: "center", emphasis: "muted" },
          },
          {
            type: "EmailFooter",
            props: {
              id: id("EmailFooter"),
              companyName: brandFull,
              address: brandAddress,
              unsubscribeUrl,
              socialLinks: [{ label: "Events", href: "https://example.com/events" }],
            },
          },
        ],
      },
    },
  },
  {
    id: "product-announcement",
    name: "Product announcement",
    description: "Launch a new product or line.",
    doc: {
      subject: "Introducing Avocado Bowls — chef-built lunches in 60 seconds",
      preheader: "Ready to heat, packed with whole grains and seasonal veg",
      data: {
        root: { props: { theme: defaultTheme } },
        content: [
          { type: "EmailHeader", props: { id: id("EmailHeader"), logoUrl: "", logoAlt: "", logoWidth: 120, alignment: "center" } },
          {
            type: "EmailHero",
            props: {
              id: id("EmailHero"),
              heading: "Meet Avocado Bowls",
              subhead: "Chef-built lunches, ready in 60 seconds. Whole grains, seasonal vegetables, clean proteins — no fillers.",
              imageUrl: "https://placehold.co/600x300?text=Avocado+Bowls",
              imageAlt: "Avocado Bowls",
              alignment: "left",
            },
          },
          {
            type: "EmailText",
            props: { id: id("EmailText"), body: "We spent eighteen months developing these. Here's what makes them different:", alignment: "left", emphasis: "normal" },
          },
          { type: "EmailDivider", props: { id: id("EmailDivider"), spacing: "default" } },
          {
            type: "EmailColumns",
            props: {
              id: id("EmailColumns"),
              leftImageUrl: "https://placehold.co/300x200?text=Whole+food",
              leftImageAlt: "Whole-food ingredients",
              leftHeading: "Whole-food ingredients",
              leftBody: "Every bowl starts with seasonal vegetables, ancient grains, and clean proteins. No fillers, no seed oils, nothing you can't pronounce.",
              rightImageUrl: "https://placehold.co/300x200?text=60+seconds",
              rightImageAlt: "60 seconds to ready",
              rightHeading: "60 seconds to ready",
              rightBody: "Microwave, peel back the lid, lunch is served. Built for the days when cooking just isn't happening.",
            },
          },
          { type: "EmailButton", props: { id: id("EmailButton"), label: "Try Avocado Bowls", href: "https://example.com/bowls", alignment: "center", color: "", textColor: "" } },
          {
            type: "EmailText",
            props: { id: id("EmailText"), body: "Available now in our online shop and at select grocers — find a store near you.", alignment: "left", emphasis: "muted" },
          },
          {
            type: "EmailFooter",
            props: {
              id: id("EmailFooter"),
              companyName: brandFull,
              address: brandAddress,
              unsubscribeUrl,
              socialLinks: [
                { label: "Instagram", href: "https://instagram.com" },
                { label: "Where to buy", href: "https://example.com/stores" },
              ],
            },
          },
        ],
      },
    },
  },
  {
    id: "feedback-survey",
    name: "Feedback survey",
    description: "Short customer feedback ask.",
    doc: {
      subject: "Quick favor — 2 minutes of your time?",
      preheader: "Your feedback shapes next season's menu",
      data: {
        root: { props: { theme: defaultTheme } },
        content: [
          { type: "EmailHeader", props: { id: id("EmailHeader"), logoUrl: "", logoAlt: "", logoWidth: 120, alignment: "center" } },
          {
            type: "EmailHero",
            props: {
              id: id("EmailHero"),
              heading: "How are we doing?",
              subhead: "We're planning next season's menu and your input genuinely shapes what we cook.",
              imageUrl: "https://placehold.co/600x300?text=We%27re+listening",
              imageAlt: "We're listening",
              alignment: "center",
            },
          },
          {
            type: "EmailText",
            props: { id: id("EmailText"), body: "Two minutes — five short questions, no logins, no marketing follow-up. Just honest signal so we can focus on the recipes you actually love.", alignment: "center", emphasis: "normal" },
          },
          { type: "EmailButton", props: { id: id("EmailButton"), label: "Take the 2-minute survey", href: "https://example.com/survey", alignment: "center", color: "", textColor: "" } },
          { type: "EmailDivider", props: { id: id("EmailDivider"), spacing: "default" } },
          {
            type: "EmailText",
            props: { id: id("EmailText"), body: "Thanks — really. We read every response.", alignment: "center", emphasis: "muted" },
          },
          {
            type: "EmailFooter",
            props: {
              id: id("EmailFooter"),
              companyName: brandFull,
              address: brandAddress,
              unsubscribeUrl,
              socialLinks: [],
            },
          },
        ],
      },
    },
  },
  {
    id: "newsletter",
    name: "Newsletter digest",
    description: "Weekly nutrition newsletter.",
    doc: {
      subject: `This week at ${brand} — recipes, tips, and what's in season`,
      preheader: "3 new recipes, a seasonal spotlight, and a reader Q&A",
      data: {
        root: { props: { theme: defaultTheme } },
        content: [
          { type: "EmailHeader", props: { id: id("EmailHeader"), logoUrl: "", logoAlt: "", logoWidth: 120, alignment: "center" } },
          {
            type: "EmailHero",
            props: {
              id: id("EmailHero"),
              heading: "The weekly digest",
              subhead: "Recipes, seasonal ingredients, and notes from our test kitchen. Five-minute read.",
              imageUrl: "https://placehold.co/600x300?text=Weekly+digest",
              imageAlt: "Newsletter cover",
              alignment: "left",
            },
          },
          { type: "EmailDivider", props: { id: id("EmailDivider"), spacing: "default" } },
          {
            type: "EmailText",
            props: { id: id("EmailText"), body: "🥬 New recipes", alignment: "left", emphasis: "strong" },
          },
          {
            type: "EmailText",
            props: {
              id: id("EmailText"),
              body: "Three new weeknight dinners built around peak-season produce — a charred broccoli grain bowl, a citrus-marinated tofu wrap, and a one-pan harissa chickpea bake. Each comes together in under 35 minutes.",
              alignment: "left",
              emphasis: "normal",
            },
          },
          { type: "EmailButton", props: { id: id("EmailButton"), label: "See all recipes", href: "https://example.com/recipes", alignment: "center", color: "", textColor: "" } },
          { type: "EmailDivider", props: { id: id("EmailDivider"), spacing: "default" } },
          {
            type: "EmailText",
            props: { id: id("EmailText"), body: "💬 Reader Q&A", alignment: "left", emphasis: "strong" },
          },
          {
            type: "EmailText",
            props: {
              id: id("EmailText"),
              body: "Top question this week: how do you store leafy greens so they actually last? Our test kitchen wrote up their three best methods — including the one that gets us through a full week of salads.",
              alignment: "left",
              emphasis: "normal",
            },
          },
          {
            type: "EmailFooter",
            props: {
              id: id("EmailFooter"),
              companyName: brandFull,
              address: brandAddress,
              unsubscribeUrl,
              socialLinks: [
                { label: "Instagram", href: "https://instagram.com" },
                { label: "Pinterest", href: "https://pinterest.com" },
                { label: "Blog", href: "https://example.com/blog" },
              ],
            },
          },
        ],
      },
    },
  },
];

export function getTemplate(id: string) {
  return templates.find((t) => t.id === id);
}
