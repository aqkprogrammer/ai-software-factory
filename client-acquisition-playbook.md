# Client Acquisition Playbook — v1 (manual)

Nothing in here is automated. That is deliberate. You automate a process after you have run it
50 times by hand and know where it actually leaks. Automate it before that and you build a machine
that produces qualified-looking leads nobody buys from.

Target: **10 real conversations and 1 paid engagement.** Not 500 emails.

---

## Step 0 — Pick the niche (do this first, everything downstream depends on it)

The niche question is not "what's a good market." It's "where does my name already mean something."

Three candidates, ranked by how much of an unfair advantage you already have:

**1. Automotive / vehicle inspection and claims** — strongest.
You worked on an AI vehicle inspection and damage-assessment platform, you delivered on-site at
Volkswagen Munich, and you built claims-adjacent systems at Innovation Group for Emirates. That is
a very specific room, and you are already in it. Buyers: insurers, motor claims TPAs, fleet
operators, used-car marketplaces, dealership groups, inspection agencies.

**2. Logistics / fleet operations** — adjacent, larger, less warm.
Overlaps technically with #1 and has the same manual-workflow problem everywhere.

**3. Ad-tech / media operations** — you spent four years at Annalect leading a team of six.
Warmest network of the three. Narrower buyer set, longer procurement cycles.

Pick one. Write it down. You can change it in three months, not three days.

> The test for a good niche: you can name five specific companies in it from memory, and you know
> what a bad week looks like for the person who would sign your invoice.

---

## Step 1 — The warm list (this is where your first client comes from)

Before any cold research, write out every person who has seen you deliver:

- Annalect / Omnicom colleagues — especially the six engineers you led and any manager who has
  since moved companies
- Volkswagen and Emirates / Innovation Group contacts from the on-site engagements
- Tractable colleagues who have moved on
- Anyone who has ever asked you "do you know someone who could build X"

Target: 25 names. Your first paid project will almost certainly come from this list, not from cold
outreach. Cold research is how you build a *pipeline*; warm contacts are how you get the *first one*.

You are not asking them for work. You are asking:

> "I'm taking on a small number of build projects in [niche]. Who do you know who's currently
> frustrated with a manual process or a system they've outgrown? Happy to just have the
> conversation and tell them if it's not worth building."

---

## Step 2 — Research 50 companies in the niche

One row per company. Do them in batches of 10. Timebox to 15 minutes each — if you can't find the
signal in 15 minutes, the lead isn't obvious enough to lead with.

### What you are looking for — observable evidence only

Never write down a pain point you cannot point at. "They probably have inefficient processes" is
worthless and it is obvious to the reader that you're guessing.

| Signal | What it looks like | What it implies |
|---|---|---|
| Manual intake | Quote / booking / claim requests go through a contact form or a phone number | No internal workflow tool |
| No customer-facing status | Customers must call to ask "where is my thing" | Portal opportunity |
| PDF / email workflows | Downloadable forms to fill and email back | Highest-value automation target |
| Job postings | Hiring "operations coordinator", "data entry", "MIS executive" | Paying humans to move data between systems |
| Job postings, technical | Hiring for a stack, or for a system you recognise | Existing team; different sale (augmentation, not build) |
| Stack age | Old CMS, no HTTPS, mobile-broken, jQuery-era frontend | Under-invested in software, may also mean no budget |
| Multiple disconnected tools | Separate portals for separate functions, no SSO | Integration opportunity |
| Recent funding or expansion | Press, LinkedIn headcount growth, new locations | Budget and urgency both present |

### The fields to record

```
company            industry           location
size (headcount)   website            decision maker (name + role)
observed signals   (3+ bullets, each one a fact you can cite)
opportunity        (one sentence, the system you'd build)
score              (see below)
status             new / researched / contacted / call booked / proposal / won / dead
last touch         (date + what happened)
```

Keep it in a spreadsheet. Not a database, not your own CRM. You are testing the process, not
building product. You will move it into your platform later and by then you'll know what columns
you actually need — which is the whole point of doing it manually first.

---

## Step 3 — Score honestly

Five factors, 20 points each. Be harsh; the score is only useful if it separates.

| Factor | 20 points looks like |
|---|---|
| **Evidence of pain** | You can name the exact broken workflow and cite where you saw it |
| **Budget capacity** | Company is big enough / funded enough that a serious build isn't absurd |
| **Access** | You know the decision maker, or have a credible one-hop intro |
| **Fit to you** | You have built this before and can talk about it with real specifics |
| **Urgency** | Something is forcing the issue now — growth, a deadline, a system failing, a competitor |

**80+** — contact this week.
**60–79** — pipeline; contact after the top tier.
**Under 60** — do not contact. Move on. Most of your 50 will land here and that is normal and fine.

The most common failure mode is a 90 on "evidence of pain" and a 20 on "urgency." That company
knows it has the problem, has known for three years, and will take eight months to not buy.

---

## Step 4 — Outreach

Two templates. Both short. Both lead with an observation, not a capability.

### Warm intro request (to your network)

> Hi [name] — I've started taking on build projects, focused on [niche]. Not looking to pitch you;
> I'm trying to find teams stuck on a manual process. If someone at [company they'd know] comes to
> mind, I'd appreciate the intro. Happy to just look at their situation and tell them straight
> whether it's worth building.

### Cold, evidence-led

> Subject: your [specific workflow] process
>
> Hi [name],
>
> I noticed [company] takes [quote requests / inspection bookings / claim submissions] through a
> contact form, and customers have to call in to check status. I've built exactly this system
> before — [one sentence of concrete relevant experience].
>
> Two questions, and no pitch: roughly how many of these come in a week, and who's handling them
> right now?
>
> [Your name]

Rules that matter more than the wording:

1. **One observed fact, stated plainly.** It proves you looked. It is the entire value of the email.
2. **Ask a question you actually want the answer to.** Not "do you have 15 minutes."
3. **No AI in the pitch.** Nobody is buying agents. They are buying "my ops team stops doing this
   by hand." How you build it is your margin, not their problem.
4. **Two follow-ups, one week apart, then stop.** A third follow-up converts almost nobody and
   costs you the option of ever contacting them again.
5. **Never send more than ~10 of these a day.** If you find yourself wanting to send hundreds,
   the niche is wrong or the research is too shallow.

---

## Step 5 — The qualification call

Your goal on this call is **not** to sell. It is to find out whether this is a real project. Half
of these should end with you saying "I don't think you need to build anything."

Questions, roughly in order:

1. Walk me through what happens today, from [trigger] to [outcome]. Who touches it?
2. How many times a week? How long does each one take?
3. What have you already tried? Why did that not stick?
4. What happens if you do nothing for another year?
5. Who else has to agree before something like this gets bought?
6. Is there a budget line for this, or would one need to be created?
7. Is there a date that matters?
8. If this worked perfectly, what changes for you personally?

**Walk away if:** there is no named person who owns the problem; nobody can quantify the volume;
the answer to "what happens if you do nothing" is "nothing"; or they want a fixed quote before
anyone has scoped it.

---

## Step 6 — Sell discovery before you sell the build

Do not quote a full build off one call. You will be wrong, and being wrong on a fixed price is how
agencies die.

**Paid discovery** — 1 to 2 weeks, fixed fee, real deliverable: requirements, architecture, scope,
phased plan, fixed quote for Phase 1. Priced low enough to be an easy yes, high enough that only
serious buyers say yes. This is the filter.

Then: **Phase 1 fixed scope** → **Phase 2** → **monthly retainer** for support and features.

The retainer is where the actual business is. One-off builds are lumpy and exhausting; retainers
compound. Structure the first project so a retainer is the obvious next step — you host it, you
monitor it, you fix it.

Set the actual numbers against the client's market and the value of the workflow you're replacing,
not against how many hours it took you. Your delivery speed is your margin. If you price on hours,
you have given the entire advantage away.

---

## What to automate, and when

In order. Do not skip ahead.

| After | Automate | Why then |
|---|---|---|
| 50 manual leads | The research pass — company → observed signals → draft brief | You now know which signals actually predicted a reply |
| 10 calls | The proposal draft — scope, architecture, phasing from call notes | You have real call notes to write the prompt against |
| 1 delivered project | Nothing new — turn the project into reusable modules instead | Delivery speed is worth more than pipeline volume at this stage |
| 3 delivered projects | The CRM, and only then move it off the spreadsheet | You finally know the schema |

The lead-research agent is a genuinely good build. It is just not the *next* one. It is worth
building the day you know exactly what a good brief looks like, because you have written 50 of
them by hand and watched which ones got replies.

---

## The two-week version

- **Days 1–2** — pick the niche, write the 25-name warm list, send warm asks
- **Days 3–7** — research 25 companies, score them
- **Days 8–10** — contact everything above 80
- **Days 11–14** — take the calls, run the qualification questions, sell one paid discovery

Success is not "a working pipeline." Success is one conversation where someone with budget
describes a broken workflow in detail and asks what you'd charge.
