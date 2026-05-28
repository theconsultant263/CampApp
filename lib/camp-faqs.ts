import { formatCurrency } from "@/lib/format";
import { TENT_PRICING } from "@/lib/pricing";

export const CAMP_FAQ_ITEMS = [
  {
    question: "I am unclear on how to register. What should I do first?",
    answer: [
      "Start by choosing your church, then enter the primary payer details. Choose one accommodation option for everyone on this invoice, add each person being paid for, select any meals they need, review the live invoice summary, and submit the registration.",
      "If your group has people using different accommodation types, please submit separate registrations for each accommodation type.",
    ],
  },
  {
    question: "When is Camp Hope 2026?",
    answer: ["Camp Hope 2026 runs from 7-11 August 2026 at Kudu Creek Farm."],
  },
  {
    question: "Who are the speakers?",
    answer: [
      "The speakers are Ps. Donnet Blake from the USA, Ps. John and April Nixon from the USA, and Ps. Sou Blose from South Africa.",
    ],
  },
  {
    question: "What is planned for ages 13-20?",
    answer: [
      "The AFM affiliate and Abundant Life South Africa team will run the camp program for ages 13-20. Their mission is to bring Abundant Life into every home in creative ways, leading young people to Jesus and equipping them to start disciple-making movements.",
      "The team will travel from Dundee and Johannesburg, South Africa, and creativity in reaching young people to follow Jesus will be central to the camp weekend.",
    ],
  },
  {
    question: "Will there be a children's program?",
    answer: [
      "Yes. The children's program is for ages 3-12, inviting children to experience following Jesus in The Army of The Lord.",
    ],
  },
  {
    question: "Can I bring my own tent?",
    answer: [
      `Yes. Choose "${TENT_PRICING.own_tent.label}" on the form. The ${formatCurrency(
        TENT_PRICING.own_tent.price,
      )} per-person camp fee still applies before any meals are selected, so three people bringing their own tent would be ${formatCurrency(
        TENT_PRICING.own_tent.price * 3,
      )} before meals.`,
      "That works out to less than $5 per person per day. The fee helps keep the camp sustainable, including running water, hot water from gas geysers, functional toilets, fires and lanterns each night, electricity for lights, and electricity for the main venues.",
    ],
  },
  {
    question: "Can I bring my own food?",
    answer: [
      "Yes. Cooking areas will be available, and campers are encouraged to bring their own food and cooking supplies if they are not purchasing camp meals.",
    ],
  },
  {
    question: "Can I exhibit a mission initiative, story, product, or service?",
    answer: [
      "Yes. On Sunday, 9 August 2026, you can request space to showcase your church or individual mission initiatives and stories from the last year, or exhibit appropriate individual business products or services.",
      "Select the exhibition option on the registration form and describe your stand. Exhibitions are subject to camp administration approval for appropriateness.",
    ],
  },
  {
    question: "What should an exhibition stand be like?",
    answer: [
      "Make it innovative, interesting, and interactive. The goal is to fast track meaningful connections and collaborations, share Together in Mission and I WILL GO experiences, and show how God is changing lives through community and national building.",
    ],
  },
  {
    question: "What if my church is not listed?",
    answer: ['Choose "Other" in the church list, then enter your church name in the field that appears.'],
  },
] as const;
