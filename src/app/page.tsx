"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  AudioLines,
  FileText,
  Check,
  ShieldCheck,
  Quote,
  Plus,
  Minus,
  Play,
  Layers,
  Menu,
  X,
  MoveDown,
  CornerDownRight,
  LockKeyhole,
  ScanLine,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { KnowledgeField } from "@/components/knowledge-field";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
const chapters = [
  {
    number: "01",
    tag: "CAPTURE WHAT YOU KNOW",
    title: "The good stuff isn’t\nin the handbook.",
    body: "The instinct that spots a problem early. The exception you learned the hard way. Upload your documents or talk it through with an AI interviewer that knows when to ask “why?”",
    label: "A conversation, not a blank page.",
    icon: AudioLines,
  },
  {
    number: "02",
    tag: "MAKE IT YOURS",
    title: "AI organises it.\nYou have the final say.",
    body: "Review every extracted insight, trace it to its source, and correct what’s missing. Only knowledge you approve can become part of your published capsule.",
    label: "Nothing goes live without your approval.",
    icon: Check,
  },
  {
    number: "03",
    tag: "PUT EXPERIENCE TO WORK",
    title: "Your expertise.\nOne question away.",
    body: "Give your team or clients access to a capsule that answers from your approved knowledge. Every answer connects to its source. If it doesn’t know, it says so.",
    label: "Real answers. With the receipts.",
    icon: Quote,
  },
];
const faqs = [
  [
    "What exactly is an Expertise Capsule?",
    "A versioned collection of your approved knowledge that people can ask questions through AI. It contains the procedures, judgement calls, cases, and exceptions you choose to share, with attribution and sources attached.",
  ],
  [
    "How is this different from uploading files to a chatbot?",
    "You review and approve the knowledge before publishing. Each published version is fixed, answers cite contributors and sources, and licenses control who can use the capsule, for what purpose, and whether AI training is permitted.",
  ],
  [
    "Does Synapse train AI on my expertise?",
    "AI-training permission is a separate, explicit setting in every license. It is off by default. Giving someone access to ask questions does not automatically grant them permission to use your knowledge for training.",
  ],
  [
    "What if the capsule doesn’t know the answer?",
    "It abstains rather than inventing your opinion. Answers must be supported by the approved knowledge in the selected capsule version.",
  ],
  [
    "Can I change who has access?",
    "Yes. You can define permitted uses, expiry dates, and usage limits, and revoke future access. Corrections to the knowledge are published as a new version so the history stays clear.",
  ],
];
export default function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const [chapter, setChapter] = useState(0);
  const [open, setOpen] = useState<number | null>(0);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const ctx = gsap.context(() => {
        gsap.from(".hero-enter", {
          y: 45,
          opacity: 0,
          stagger: 0.12,
          duration: 1,
          ease: "power3.out",
        });
        gsap.to(".scroll-progress", {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
          },
        });
        gsap.to(".hero-visual", {
          y: 90,
          rotate: 3,
          ease: "none",
          scrollTrigger: {
            trigger: ".hero",
            start: "top top",
            end: "bottom top",
            scrub: 1,
          },
        });
        gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) =>
          gsap.from(el, {
            y: 45,
            opacity: 0,
            duration: 0.85,
            scrollTrigger: { trigger: el, start: "top 90%" },
          }),
        );
        ScrollTrigger.create({
          trigger: ".story-track",
          start: "top top",
          end: "bottom bottom",
          onUpdate: (self) =>
            setChapter(Math.min(2, Math.floor(self.progress * 3))),
        });
        gsap.to(".oversize-word", {
          xPercent: -12,
          ease: "none",
          scrollTrigger: {
            trigger: ".statement",
            start: "top bottom",
            end: "bottom top",
            scrub: 1,
          },
        });
      }, root);
      return () => ctx.revert();
    });
    return () => mm.revert();
  }, []);
  return (
    <div ref={root} className="landing">
      <div className="scroll-progress" />
      <header className="public-nav">
        <Brand />
        <nav
          className={menu ? "nav-links is-open" : "nav-links"}
          aria-label="Main navigation"
        >
          <a onClick={() => setMenu(false)} href="#how-it-works">
            How it works
          </a>
          <Link href="/capsules">Explore capsules</Link>
          <a onClick={() => setMenu(false)} href="#your-rules">
            Your rules
          </a>
        </nav>
        <div className="nav-actions">
          <Link href="/login" className="nav-login">
            Log in
          </Link>
          <Link href="/register" className="button button-dark small">
            Create your capsule <ArrowUpRight size={17} />
          </Link>
          <button
            className="menu-toggle"
            aria-label="Toggle navigation"
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <main>
        <section className="hero section-wrap">
          <div className="hero-copy">
            <div className="eyebrow hero-enter">
              <span className="tiny-star">✳</span> HUMAN EXPERTISE. NEW
              POSSIBILITIES.
            </div>
            <h1 className="hero-enter">
              You know things
              <br />
              AI <span className="serif">doesn’t.</span>
              <br />
              Let’s change that<span className="mint-dot">.</span>
            </h1>
            <p className="hero-description hero-enter">
              Turn your expertise into AI others can actually use.
            </p>
            <p className="hero-detail hero-enter">
              Capture what you know. Approve what it learns. Give your team or
              clients answers grounded in <em>your</em> experience—with you in
              control.
            </p>
            <div className="hero-ctas hero-enter">
              <Link href="/register" className="button button-dark">
                Build your first capsule <ArrowUpRight size={19} />
              </Link>
              <a href="#how-it-works" className="text-button">
                <span className="play-circle">
                  <Play size={12} fill="currentColor" />
                </span>{" "}
                See how it works
              </a>
            </div>
            <div className="hero-note hero-enter">
              <ShieldCheck size={15} /> Your knowledge. Your permissions. Your
              name on it.
            </div>
          </div>
          <div className="hero-visual hero-enter">
            <div className="visual-topline">
              <span>EXPERTISE, CONNECTED</span>
              <span>FIG. 001 ↗</span>
            </div>
            <div className="field-wrap">
              <KnowledgeField />
              <div className="field-center">
                <span className="orb-label">YOUR</span>
                <strong>experience</strong>
                <span className="orb-label">→ COLLECTIVE POSSIBILITY</span>
              </div>
              <div className="orbit-tag orbit-one">
                <AudioLines size={17} /> The things you just know
              </div>
              <div className="orbit-tag orbit-two">
                <FileText size={16} /> Years of lessons learned
              </div>
              <div className="orbit-tag orbit-three">
                <Check size={16} /> Reviewed by you
              </div>
            </div>
            <div className="visual-answer">
              <div className="answer-label">
                <span className="mini-logo">✳</span> YOUR EXPERTISE CAPSULE{" "}
                <span className="version-pill">v1.0</span>
              </div>
              <p>“How would you handle this?”</p>
              <div className="answer-lines">
                <span />
                <span />
                <span />
              </div>
              <div className="answer-bottom">
                <span>
                  <Check size={12} /> Grounded in your knowledge
                </span>
                <span>3 sources ↗</span>
              </div>
            </div>
            <div className="visual-bottomline">
              <span>EXPERIENCE → KNOWLEDGE → ANSWERS</span>
              <ScanLine size={19} />
            </div>
          </div>
          <div className="hero-bottom">
            <span>Built for the knowledge only people have.</span>
            <a href="#the-problem">
              SCROLL TO CONNECT THE DOTS <MoveDown size={15} />
            </a>
          </div>
        </section>
        <section id="the-problem" className="problem section-wrap">
          <div className="section-kicker reveal">
            <span>01 / THE KNOWLEDGE GAP</span>
            <span>EXPERIENCE SHOULDN’T DISAPPEAR.</span>
          </div>
          <div className="problem-grid">
            <h2 className="reveal">
              Decades to learn.
              <br />
              <span className="muted">Too easy to lose.</span>
            </h2>
            <div className="problem-copy reveal">
              <p>
                Your best knowledge isn’t always written down. It’s in the
                decisions you make, the patterns you notice, and the mistakes
                you know to avoid.
              </p>
              <p>
                When you leave the room, that experience leaves with you.{" "}
                <strong>Synapse gives it a way to stay useful.</strong>
              </p>
            </div>
          </div>
          <div className="experience-strip reveal">
            <span>
              <AudioLines /> The explanation after the meeting
            </span>
            <Plus />
            <span>
              <FileText /> The note in the margin
            </span>
            <Plus />
            <span>
              <Layers /> The lesson from a hard case
            </span>
          </div>
        </section>
        <section id="how-it-works" className="story-track">
          <div className="story-pin section-wrap">
            <div className="section-kicker">
              <span>02 / FROM YOUR MIND TO THEIR NEXT MOVE</span>
              <span className="story-counter">
                {chapters[chapter].number} — 03
              </span>
            </div>
            <div className="story-layout">
              <div className="story-copy" key={chapter}>
                <span className="mint eyebrow">{chapters[chapter].tag}</span>
                <h2>
                  {chapters[chapter].title.split("\n").map((line, i) => (
                    <span key={i}>
                      {line}
                      <br />
                    </span>
                  ))}
                </h2>
                <p>{chapters[chapter].body}</p>
                <div className="story-assurance">
                  <ShieldCheck size={17} />
                  {chapters[chapter].label}
                </div>
              </div>
              <div className={`story-demo stage-${chapter}`}>
                <div className="demo-toolbar">
                  <span className="window-dots">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>
                    synapse /{" "}
                    {
                      ["capture studio", "knowledge review", "ask capsule"][
                        chapter
                      ]
                    }
                  </span>
                  <LockKeyhole size={13} />
                </div>
                {chapter === 0 ? (
                  <div className="interview-demo">
                    <div className="demo-profile">
                      <span className="avatar">AJ</span>
                      <div>
                        <strong>Alex’s field experience</strong>
                        <small>Expert interview · Illustrative example</small>
                      </div>
                      <span className="recording">RECORDING</span>
                    </div>
                    <div className="waveform">
                      {Array.from({ length: 45 }, (_, i) => (
                        <i
                          key={i}
                          style={{
                            height: `${Math.round(15 + Math.sin(i * 2.7) ** 2 * 65)}px`,
                            animationDelay: `${i * 0.04}s`,
                          }}
                        />
                      ))}
                    </div>
                    <div className="interview-question">
                      <span>FOLLOW-UP QUESTION</span>
                      <p>
                        What’s the first sign that tells you the usual approach
                        won’t work?
                      </p>
                    </div>
                    <div className="transcript-snippet">
                      “The numbers might look fine. But the first thing I check
                      is what changed just before the problem…”
                    </div>
                  </div>
                ) : chapter === 1 ? (
                  <div className="review-demo">
                    <span className="eyebrow">
                      EXTRACTED INSIGHT / HEURISTIC
                    </span>
                    <h3>Look for the change before the failure.</h3>
                    <p>
                      Before replacing a component, check what changed in the
                      operating conditions immediately before the fault
                      appeared.
                    </p>
                    <div className="citation-mini">
                      <Quote size={16} />
                      <div>
                        Alex’s field experience
                        <small>Interview · 04:32–05:18</small>
                      </div>
                      <ArrowUpRight size={16} />
                    </div>
                    <div className="review-actions">
                      <span>
                        <Check size={17} /> Approved by Alex
                      </span>
                      <span>01 of 12 insights</span>
                    </div>
                  </div>
                ) : (
                  <div className="query-demo">
                    <div className="demo-user-question">
                      Where should I start when a recurring fault comes back?
                    </div>
                    <div className="demo-answer">
                      <span className="mini-logo">✳</span>
                      <div>
                        <strong>Start with what changed.</strong>
                        <p>
                          The capsule’s approved knowledge indicates checking
                          recent operating changes before replacing components.{" "}
                          <sup>[1]</sup>
                        </p>
                        <div className="citation-chip">
                          <FileText size={13} /> Field interview · Alex{" "}
                          <ArrowUpRight size={13} />
                        </div>
                        <small>Based on approved knowledge · v1.0</small>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="chapter-nav">
              {chapters.map((c, i) => (
                <button
                  key={c.number}
                  className={chapter === i ? "active" : ""}
                  onClick={() => {
                    setChapter(i);
                    const el = document.querySelector(".story-track");
                    if (
                      el &&
                      !matchMedia("(prefers-reduced-motion: reduce)").matches
                    )
                      window.scrollTo({
                        top:
                          window.scrollY +
                          el.getBoundingClientRect().top +
                          (el.clientHeight - window.innerHeight) *
                            (i / 3 + 0.08),
                        behavior: "smooth",
                      });
                  }}
                >
                  <span>{c.number}</span>
                  {["Capture", "Review", "Share"][i]}
                  <span className="chapter-line" />
                </button>
              ))}
            </div>
          </div>
        </section>
        <section id="your-rules" className="control-section section-wrap">
          <div className="section-kicker reveal">
            <span>03 / EXPERTISE WITHOUT GIVING IT AWAY</span>
            <span>CONTROL IS THE POINT.</span>
          </div>
          <div className="control-heading">
            <h2 className="reveal">
              Open up your knowledge.
              <br />
              Keep hold of <span className="serif">the keys.</span>
            </h2>
            <p className="reveal">
              Sharing what you know shouldn’t mean losing the say in how it’s
              used.
            </p>
          </div>
          <div className="control-grid">
            <article className="permission-card reveal">
              <div className="card-top">
                <LockKeyhole size={23} />
                <span>01</span>
              </div>
              <h3>
                Your expertise.
                <br />
                Your terms.
              </h3>
              <p>
                Choose who gets access, what they can use it for, and when it
                expires.
              </p>
              <div className="permission-row">
                <span>Team access</span>
                <span className="permission-value">
                  Allowed <Check size={13} />
                </span>
              </div>
              <div className="permission-row">
                <span>AI model training</span>
                <span className="off-switch" aria-label="Off by default" />
              </div>
              <div className="permission-row">
                <span>Access duration</span>
                <span>90 days</span>
              </div>
              <small>Example license settings</small>
            </article>
            <article className="attribution-card reveal">
              <div className="card-top">
                <Quote size={25} />
                <span>02</span>
              </div>
              <h3>
                Every answer has
                <br />a human behind it.
              </h3>
              <p>
                Sources, contributors, and corrections stay connected. Good
                advice never loses its author.
              </p>
              <div className="attribution-example">
                <span className="avatar">AJ</span>
                <div>
                  <strong>Alex Jordan</strong>
                  <span>Original contributor</span>
                </div>
                <ShieldCheck size={22} />
              </div>
              <div className="trace-line">
                <span />
                Interview → Approved insight → Cited answer
              </div>
            </article>
            <article className="version-card reveal">
              <div className="card-top">
                <Layers size={24} />
                <span>03</span>
              </div>
              <h3>
                Knowledge evolves.
                <br />
                History stays intact.
              </h3>
              <p>
                Publish a new version when your thinking changes. Keep a
                verifiable record of what was approved and when.
              </p>
              <div className="version-timeline">
                <div>
                  <i />
                  <strong>v1.0</strong>
                  <span>First principles</span>
                  <Check size={15} />
                </div>
                <div>
                  <i />
                  <strong>v1.1</strong>
                  <span>Lessons from the field</span>
                  <Check size={15} />
                </div>
                <div>
                  <i />
                  <strong>v2.0</strong>
                  <span>Your next breakthrough</span>
                  <span className="draft-label">DRAFT</span>
                </div>
              </div>
            </article>
          </div>
        </section>
        <section className="use-section section-wrap">
          <div className="section-kicker reveal">
            <span>04 / MADE FOR PEOPLE WHO KNOW</span>
            <span>FROM ONE EXPERT TO MANY MINDS.</span>
          </div>
          <div className="use-heading">
            <h2 className="reveal">
              The right experience.
              <br />
              In the right hands.
            </h2>
            <Link href="/capsules" className="text-button reveal">
              Explore capsules <ArrowUpRight size={19} />
            </Link>
          </div>
          <div className="use-grid">
            {[
              {
                tag: "FOR EXPERIENCED PROFESSIONALS",
                title: "Your judgement,\nbeyond your calendar.",
                body: "Help clients draw on your methods and hard-won lessons, even when you’re not in the meeting.",
                type: "expert",
                icon: AudioLines,
              },
              {
                tag: "FOR TEAMS & ORGANISATIONS",
                title: "When people move on,\nknowledge stays.",
                body: "Capture the know-how behind the job. Give the next person more than a folder of handover notes.",
                type: "team",
                icon: Layers,
              },
              {
                tag: "FOR PEOPLE LEARNING THE ROPES",
                title: "Ask the question.\nUnderstand the why.",
                body: "Learn from approved expert experience, with cases, conditions, and sources you can follow.",
                type: "learn",
                icon: Quote,
              },
            ].map((c) => (
              <article className={`use-card ${c.type} reveal`} key={c.tag}>
                <div className="use-art">
                  <c.icon size={65} strokeWidth={0.8} />
                  <div className="art-grid" />
                  <span>
                    {c.type === "expert"
                      ? "01 → ∞"
                      : c.type === "team"
                        ? "KNOW-HOW / HANDOVER"
                        : "QUESTION → UNDERSTANDING"}
                  </span>
                </div>
                <div className="use-card-copy">
                  <span className="eyebrow">{c.tag}</span>
                  <h3>
                    {c.title.split("\n").map((s, i) => (
                      <span key={i}>
                        {s}
                        <br />
                      </span>
                    ))}
                  </h3>
                  <p>{c.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="statement">
          <div className="oversize-word" aria-hidden="true">
            HUMAN KNOW-HOW.
          </div>
          <div className="statement-copy reveal">
            <span className="tiny-star">✳</span>
            <h2>
              AI has information.
              <br />
              You have <span className="serif">experience.</span>
            </h2>
            <p>Put the two together. On your terms.</p>
            <Link href="/register" className="button button-mint">
              Give your expertise a Synapse <ArrowUpRight size={20} />
            </Link>
          </div>
        </section>
        <section className="faq-section section-wrap">
          <div className="faq-title reveal">
            <span className="eyebrow">A FEW THINGS WORTH KNOWING</span>
            <h2>
              Good questions.
              <br />
              Straight answers.
            </h2>
            <CornerDownRight size={45} strokeWidth={1} />
          </div>
          <div className="faq-list">
            {faqs.map(([q, a], i) => (
              <article key={q} className="faq-item reveal">
                <button
                  aria-expanded={open === i}
                  aria-controls={`faq-${i}`}
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  {q}
                  {open === i ? <Minus size={19} /> : <Plus size={19} />}
                </button>
                <div id={`faq-${i}`} hidden={open !== i}>
                  <p>{a}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="public-footer section-wrap">
        <div className="footer-top">
          <Brand />
          <p>Human expertise. Connected.</p>
          <a href="#">Back to top ↑</a>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Synapse</span>
          <div>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/capsules">
              Explore capsules <ArrowRight size={13} />
            </Link>
          </div>
          <span>BUILT AROUND WHAT YOU KNOW.</span>
        </div>
      </footer>
    </div>
  );
}
