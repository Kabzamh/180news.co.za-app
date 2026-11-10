export interface Comment {
  id: string;
  author: string;
  avatar?: string;
  text: string;
  date: string;
  upvotes: number;
  downvotes: number;
  replies?: Comment[];
}

export interface Article {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  content: string[];
  category: 'South Africa' | 'Opinion' | 'Business' | 'Tech' | 'Sport' | 'Entertainment' | 'World';
  author: {
    name: string;
    role: string;
    avatar: string;
  };
  date: string;
  time: string;
  image: string;
  readTime: string;
  commentsCount: number;
  comments: Comment[];
  reactions: {
    like: number;
    surprised: number;
    angry: number;
    sad: number;
    proud: number;
  };
  isBreaking?: boolean;
  source: string;
}

export const mockArticles: Article[] = [
  {
    id: 'sa-lead-1',
    title: 'Eskom Declares "Stage 0" Indefinitely as New Generation Fleet Hits Record 75% Energy Availability',
    subtitle: 'The power utility credits aggressive maintenance, private sector integration, and rapid solar adoption for the country-wide grid stability.',
    summary: 'In a landmark briefing in Pretoria, Eskom’s executive leadership announced that South Africa’s power grid has reached its highest stability level in over a decade, signaling a permanent end to planned blackouts.',
    category: 'South Africa',
    author: {
      name: 'Sipho Ndlovu',
      role: 'Senior Energy Correspondent',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
    },
    date: '10 November 2026',
    time: '08:30',
    image: '/public/images/tech.jpg',
    readTime: '5 min read',
    commentsCount: 42,
    reactions: { like: 312, surprised: 89, angry: 4, sad: 1, proud: 245 },
    isBreaking: true,
    source: '180news Pretoria',
    content: [
      'PRETORIA – Eskom has officially announced that the South African electricity grid has entered a phase of sustained stability, declaring "Stage 0" load shedding indefinitely. This comes after the Energy Availability Factor (EAF) of the utility’s generation fleet touched an impressive 75.4% over the past consecutive 30 days.',
      'Speaking at the Megawatt Park headquarters, Eskom’s Chief Executive officer expressed confidence that the structural reforms initiated in 2024 have finally borne fruit. "We are not just experiencing a temporary reprieve. The combination of aggressive, deep-cycle maintenance at our core coal stations, the synchronization of new units, and the massive influx of private rooftop solar has permanently altered our supply-demand dynamics," he said.',
      'Over the last two years, South African households and businesses installed an estimated 6,200MW of private rooftop solar, effectively shaving off peak demand during the day and allowing Eskom to replenish its pumped storage schemes without burning excessive diesel.',
      'Furthermore, the long-awaited unbundling of Eskom into separate generation, transmission, and distribution entities is now 90% complete. The National Transmission Company of South Africa (NTCSA) has already signed grid-access agreements with 14 independent power producers (IPPs), adding another 1,800MW of wind and battery storage to the national grid before the end of this year.',
      'While the utility warned that isolated localized outages due to municipal infrastructure failure and cable theft remain a challenge, the era of national load shedding is officially behind us. Energy experts have hailed the announcement as a watershed moment for the South African economy, which is projected to grow by 2.8% in 2027 as a direct result of energy security.'
    ],
    comments: [
      {
        id: 'c1',
        author: 'Thabo_GP',
        text: 'I never thought I would see the day! Stage 0 indefinitely! I can finally sell my generator on Facebook Marketplace. Well done to the engineers at Eskom who actually did the hard work.',
        date: '10 Nov 2026, 08:45',
        upvotes: 114,
        downvotes: 2
      },
      {
        id: 'c2',
        author: 'CapeTownian_99',
        text: 'Great news, but let’s not celebrate too early. The municipal infrastructure in Cape Town and Joburg is still failing. My power went off yesterday because of a substation explosion. Eskom might be stable, but our local municipalities are still struggling.',
        date: '10 Nov 2026, 09:02',
        upvotes: 67,
        downvotes: 5
      },
      {
        id: 'c3',
        author: 'BraaiMasterZAR',
        text: 'Best news of 2026! This is going to save businesses millions. Let us hope the electricity tariffs do not keep skyrocketing though.',
        date: '10 Nov 2026, 09:15',
        upvotes: 89,
        downvotes: 1
      }
    ]
  },
  {
    id: 'bus-1',
    title: 'Rand Rallies to R17.15 against US Dollar Following Moody’s Credit Outlook Upgrade',
    subtitle: 'The South African currency registers its strongest performance of the year as fiscal discipline and stable power supply boost investor confidence.',
    summary: 'The South African Rand surged by over 2.5% on Tuesday morning after Moody’s Investor Service revised the country’s sovereign credit rating outlook from "stable" to "positive," citing improved governance and structural reforms.',
    category: 'Business',
    author: {
      name: 'Ashleigh van Wyk',
      role: 'Financial Markets Editor',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face'
    },
    date: '10 November 2026',
    time: '11:15',
    image: '/public/images/business.jpg',
    readTime: '4 min read',
    commentsCount: 18,
    reactions: { like: 184, surprised: 45, angry: 2, sad: 0, proud: 110 },
    source: '180news Business',
    content: [
      'JOHANNESBURG – The South African Rand (ZAR) advanced to R17.15 against the US Dollar (USD) on Tuesday, marking its strongest level since late 2024. The rally was ignited by Moody’s decision to upgrade South Africa’s credit outlook, a move that surprised local and international analysts.',
      'In its official release, Moody’s praised South Africa’s National Treasury for its unwavering commitment to fiscal consolidation, pointing to a shrinking budget deficit and a stabilizing debt-to-GDP ratio.',
      '"The positive outlook reflects the ongoing acceleration of structural reforms, particularly in the energy and logistics sectors," the ratings agency noted. "The resolution of electricity shortages and the progressive concessioning of key port berths to private operators are unlocking significant growth potential."',
      'Local bond yields fell sharply in response, with the benchmark 10-year yield dropping below 9% for the first time in three years. Foreign inflows into the Johannesburg Stock Exchange (JSE) have also surged, with net foreign buying of South African equities reaching R4.2 billion this week alone.',
      'Chief Economist at Rand Merchant Bank (RMB) commented: "What we are seeing is a massive re-rating of South African assets. For years, South Africa was heavily discounted due to load shedding and political uncertainty. Now that those risks are receding, global capital is flowing back into our high-yield market. If this trend continues, we could see the Rand testing R16.80 by Christmas."'
    ],
    comments: [
      {
        id: 'c4',
        author: 'Investor_ZAR',
        text: 'This is huge for our import costs. Petrol prices should come down next month if the Rand holds these gains. Treasury deserves credit here.',
        date: '10 Nov 2026, 11:30',
        upvotes: 45,
        downvotes: 0
      },
      {
        id: 'c5',
        author: 'ScepticSam',
        text: 'Good for the Rand, but inflation is still biting the average man on the street. Food prices are still way too high.',
        date: '10 Nov 2026, 11:42',
        upvotes: 23,
        downvotes: 1
      }
    ]
  },
  {
    id: 'sport-1',
    title: 'Springboks Secure Sensational Victory over All Blacks at Twickenham to Retain World No. 1 Spot',
    subtitle: 'A late Cheslin Kolbe try and masterclass defense seal a historic 27-24 win in an absolute classic.',
    summary: 'In one of the most physical and thrilling rugby encounters of the decade, the Springboks edged out New Zealand’s All Blacks at a packed Twickenham Stadium, solidifying their standing at the summit of world rugby.',
    category: 'Sport',
    author: {
      name: 'Francois du Toit',
      role: 'Chief Sports Writer',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face'
    },
    date: '9 November 2026',
    time: '21:45',
    image: '/public/images/sport.jpg',
    readTime: '6 min read',
    commentsCount: 56,
    reactions: { like: 540, surprised: 24, angry: 1, sad: 1, proud: 498 },
    source: '180news London',
    content: [
      'LONDON – A moment of sheer individual brilliance from Cheslin Kolbe in the 76th minute propelled the Springboks to a breathtaking 27-24 victory over the All Blacks in front of 82,000 fans at Twickenham on Saturday evening.',
      'The match, billed as the ultimate clash of rugby titans, lived up to every ounce of its pre-match hype. The All Blacks dominated early possession, breaching the Bok defense in the 14th minute through a scintillating backline move finished by Will Jordan. However, the South African pack slowly ground their way back into the contest.',
      'The Springboks’ "Bomb Squad" made an impact as early as the 45th minute, with a completely fresh front row forcing three consecutive scrum penalties. This allowed flyhalf Handré Pollard to chip away at the scoreboard, keeping the Boks within striking distance.',
      'Trailing 24-20 with just four minutes on the clock, the Springboks launched a desperate attack from inside their own half. Damian Willemse delivered a perfectly weighted cut-out pass to Kolbe on the right wing. The diminutive speedster stepped inside two defenders, chipped over the fullback, and gathered the ball in mid-air to dot down under the posts, sending the South African supporters into absolute delirium.',
      'Head Coach Rassie Erasmus was full of praise for his team’s resilience: "We knew New Zealand would test us in the wider channels. They are an unbelievable team. But these boys just don’t know how to quit. The character they showed in the last ten minutes is what makes this jersey special."'
    ],
    comments: [
      {
        id: 'c6',
        author: 'BokkeForLife',
        text: 'CHESLIN KOLBE YOU BEAUTY!!! What a try! My heart was in my throat for the last 10 minutes. Proudly South African!',
        date: '09 Nov 2026, 22:00',
        upvotes: 215,
        downvotes: 1
      },
      {
        id: 'c7',
        author: 'KiwiInJoburg',
        text: 'Incredible game of rugby. As an All Blacks fan, it hurts to lose like that, but hats off to the Boks. Their bench depth is just unmatched. Best rivalry in sport by far.',
        date: '09 Nov 2026, 22:15',
        upvotes: 98,
        downvotes: 3
      }
    ]
  },
  {
    id: 'op-1',
    title: 'OPINION | The Silent Revolution: How South African Municipalities are Reclaiming their Futures',
    subtitle: 'Away from the national political noise, a network of dedicated local administrators and civic groups is quietly fixing the country from the ground up.',
    summary: 'While national headlines focus on coalition squabbles and high-level political drama, a quiet turnaround is happening at the local government level across South Africa, led by active citizenship and public-private partnerships.',
    category: 'Opinion',
    author: {
      name: 'Prof. Amanda Govender',
      role: 'Political Analyst & Guest Columnist',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face'
    },
    date: '10 November 2026',
    time: '06:15',
    image: '/public/images/capetown.jpg',
    readTime: '6 min read',
    commentsCount: 12,
    reactions: { like: 92, surprised: 14, angry: 3, sad: 1, proud: 84 },
    source: '180news Opinion',
    content: [
      'It is easy to look at South Africa’s public discourse and conclude that we are a nation in perpetual crisis. The headlines are dominated by the push-and-pull of coalition politics, the slow wheels of justice, and the latest municipal audit failures. But if you look closer, beneath the surface of national politics, a silent and profoundly hopeful revolution is taking place.',
      'In dozens of small towns and medium-sized municipalities across the Eastern Cape, Free State, and KwaZulu-Natal, local citizens, business chambers, and municipal administrators have stopped waiting for Pretoria to save them. They are forming active, collaborative coalitions of a different kind.',
      'Take the town of Middelburg, for instance. Faced with a failing water treatment plant last year, the local business chamber partnered with the municipality, contributing technical expertise and funding, while the council streamlined approvals and provided labor. Today, the water is clean, flowing, and the plant is running at 100% efficiency.',
      'This is not privatization; it is "co-governance." It is the realization that the local state and active citizens are not adversaries, but stakeholders in the same square mile. When civic organizations stop throwing stones and municipalities open their doors to professional help, things get fixed.',
      'Our national political theater will continue to entertain and exhaust us. But the true resilience of South Africa does not lie in parliament. It lies in the community-led initiatives, the neighborhood watches patching their own roads, and the local engineers volunteering their weekends. The future of South Africa is being built from the bottom up, one street, one substation, and one water pipe at a time.'
    ],
    comments: [
      {
        id: 'c8',
        author: 'CivicMinded',
        text: 'This is the most refreshing article I have read in months. Active citizenship is the only way forward. We cannot expect government to do everything when we have the skills in our communities.',
        date: '10 Nov 2026, 07:10',
        upvotes: 43,
        downvotes: 1
      },
      {
        id: 'c9',
        author: 'GautengCitizen',
        text: 'Spot on, Prof. Govender. In our suburb, we have adopted our local park and the municipality is actually helping us cut the grass now. It is a small start, but it works.',
        date: '10 Nov 2026, 07:35',
        upvotes: 29,
        downvotes: 0
      }
    ]
  },
  {
    id: 'sa-2',
    title: 'Gauteng Launches High-Tech Integrated Command Centre to Combat Hijackings and Infrastructure Theft',
    subtitle: 'Equipped with AI-powered CCTV, drone fleets, and real-time tracking, the facility aims to slash response times to under five minutes.',
    summary: 'The Gauteng Department of Community Safety has unveiled a state-of-the-art Command Centre in Johannesburg, integrating police, private security, and community policing forums under a single, high-tech umbrella.',
    category: 'South Africa',
    author: {
      name: 'Kabelo Molefe',
      role: 'Crime & Security Reporter',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face'
    },
    date: '10 November 2026',
    time: '10:45',
    image: '/public/images/joburg.jpg',
    readTime: '4 min read',
    commentsCount: 22,
    reactions: { like: 145, surprised: 32, angry: 8, sad: 2, proud: 120 },
    source: '180news Johannesburg',
    content: [
      'JOHANNESBURG – In a major bid to tackle violent crime, hijacking, and the rampant theft of public infrastructure, the Gauteng provincial government has launched its new Integrated Command Centre (ICC) in Midrand.',
      'The multi-billion Rand facility acts as a centralized nerve center, connecting over 8,500 AI-enabled CCTV cameras across Johannesburg, Pretoria, and Ekurhuleni. The cameras are equipped with advanced Automatic Number Plate Recognition (ANPR) and facial recognition technology, instantly flagging stolen vehicles or suspects with active warrants.',
      'Crucially, the ICC bridges the gap between public law enforcement and the private security sector. For the first time, dispatchers can view the real-time GPS locations of both SAPS vehicles and over 300 private security patrol units, allowing the closest vehicle to be dispatched to an active crime scene regardless of whether it is public or private.',
      'The centre also houses a specialized drone unit. In high-risk areas, autonomous drone hubs have been installed. When a panic signal is received, a drone is dispatched within 30 seconds to provide aerial surveillance and track fleeing suspects before ground units arrive.',
      'Gauteng Premier Panyaza Lesufi, speaking at the launch, said: "We are taking back our streets using technology. Crime syndicates have been using advanced methods, and we are now outsmarting them. This command centre is not just a room with screens; it is a weapon against lawlessness."'
    ],
    comments: [
      {
        id: 'c10',
        author: 'JoburgResident',
        text: 'This is brilliant. We need to see more visible policing, but using technology to bridge private security and SAPS is a massive step forward. Midrand has been a hotspot for too long.',
        date: '10 Nov 2026, 11:00',
        upvotes: 56,
        downvotes: 1
      },
      {
        id: 'c11',
        author: 'PrivacyAdvocate',
        text: 'ANPR and facial recognition are powerful tools, but we need strict oversight on how this data is stored and who has access to it. Let’s not turn Gauteng into a surveillance state.',
        date: '10 Nov 2026, 11:15',
        upvotes: 18,
        downvotes: 12
      }
    ]
  },
  {
    id: 'ent-1',
    title: 'Local Sensation Tyla Sweeps Five Categories at the 2026 South African Music Awards (SAMAs)',
    subtitle: 'The "Water" hitmaker dominates the night, dedicating her Album of the Year award to the youth of Johannesburg.',
    summary: 'Johannesburg-born global superstar Tyla was the undisputed queen of the 32nd annual SAMAs, taking home five trophies including Artist of the Year and Album of the Year in front of a star-studded Durban ICC audience.',
    category: 'Entertainment',
    author: {
      name: 'Zanele Ndaba',
      role: 'Showbiz Editor',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face'
    },
    date: '9 November 2026',
    time: '23:15',
    image: '/public/images/entertainment.jpg',
    readTime: '3 min read',
    commentsCount: 31,
    reactions: { like: 412, surprised: 15, angry: 0, sad: 1, proud: 380 },
    source: '180news Durban',
    content: [
      'DURBAN – Global pop-R&B sensation Tyla cemented her status as South Africa’s premier musical ambassador, sweeping five major categories at the South African Music Awards (SAMAs) held at the Durban ICC on Saturday night.',
      'The 24-year-old singer, who has taken the international music charts by storm over the last three years, won Best Pop Album, Female Artist of the Year, Best Music Video, Artist of the Year, and the coveted Album of the Year for her self-titled sophomore release.',
      'Dressed in a stunning, custom-made metallic gown inspired by traditional Zulu beadwork, Tyla received a standing ovation as she took the stage to accept the Album of the Year trophy.',
      '"This is so emotional for me," Tyla said, wiping away tears. "I travel the world, I perform on the biggest stages, but there is absolutely nothing like being recognized by my own people at home. This award is for every young kid in Joburg who has a dream. Do not let anyone tell you your dreams are too big for Africa. We are the future of music!"',
      'The ceremony also featured spectacular live performances, including a high-energy Amapiano medley by Kabza De Small and DJ Maphorisa, and a moving tribute to the late legendary jazz icon Hugh Masekela.'
    ],
    comments: [
      {
        id: 'c12',
        author: 'TylaFanatic',
        text: 'She deserves every single award! Tyla has put South African music on the global map like never before. A true queen!',
        date: '09 Nov 2026, 23:45',
        upvotes: 142,
        downvotes: 2
      },
      {
        id: 'c13',
        author: 'AmapianoGroove',
        text: 'The performance by Kabza and Maphorisa was also out of this world. South African music is in its golden age right now.',
        date: '10 Nov 2026, 00:10',
        upvotes: 63,
        downvotes: 0
      }
    ]
  }
];
