// Chapter 2: every voiced line. Plain data.
import type { Line } from '../../lines';

export const S: Record<string, Line[]> = {
  open: [
    { who: 'lantern', text: 'Thrusters two and three are firing. Thruster two pushes two across and one up. Thruster three pushes one across and three up.' },
    { who: 'bram', text: 'The pulse locked both gimbals flat. Until I free them, the thrusters only push along the deck.' },
    { who: 'wren', text: 'The *Meridian*’s signal is out there somewhere. My brother is asleep on that ark.', say: 'The Meridian’s signal is out there somewhere. My brother is asleep on that ark.' },
    { who: 'wren', text: 'Two thrusters, Nav. Where can they take us?' },
  ],
  holo: [
    { who: 'bram', text: 'Before Wren flies anything, a test on the holotable. Two arrows. I can bend the second one.' },
    { who: 'lantern', text: 'The glow marks every point the two arrows can reach.' },
  ],
  p1Win: [{ who: 'bram', text: 'One value. Four. Then the second arrow lies on the first one’s line, and almost the whole deck is out of reach.' }],
  thrusters: [
    { who: 'wren', text: 'Back to the real thrusters. Each one has a dial. You set the dials, I fire what you set.' },
    { who: 'lantern', text: 'The glow marks every point the yellow tip has visited. Beacon at five across, five up.' },
  ],
  p2Win: [{ who: 'wren', text: 'Two of one, one of the other. On the beacon.' }],
  p3: [{ who: 'wren', text: 'Next beacon is straight up from the start. Both thrusters push to the right. Your call, Nav.' }],
  p3Win: [{ who: 'bram', text: 'Thruster two fired backwards. Nobody said a dial stops at zero.' }],
  p4: [
    { who: 'lantern', text: 'Beacon at four across, seven up. The dial planner is offline.' },
    { who: 'bram', text: 'Then we work the dials out by hand. Two equations, one for across, one for up.' },
  ],
  p4Win: [{ who: 'lantern', text: 'Landed on (4, 7). One of thruster two, two of thruster three. The working matches.', say: 'Landed on four, seven. One of thruster two, two of thruster three. The working matches.' }],
  failover: [
    { who: 'lantern', text: 'Thruster three is overheating. Switching it to the backup nozzle.' },
    { who: 'bram', text: 'The backup is bolted on crooked. It pushes minus four across, minus two up.' },
    { who: 'wren', text: 'Same dials, different push. Show me what we can reach now.' },
  ],
  p5Win: [{ who: 'wren', text: 'One line. Every dial setting lands on one line. Two thrusters, and we fly like we have one.' }],
  gimbals: [
    { who: 'bram', text: 'Main nozzle is back on thruster three. Before I free the gimbals, I want to know why the glow is always flat.' },
  ],
  p6Win: [
    { who: 'lantern', text: 'Edge-on. Every point the two thrusters reach has height equal to across plus up.' },
    { who: 'lantern', text: 'The signal is at one across, one up, height zero. Our thrusters reach height two there. The signal is off the plane.' },
  ],
  p7: [{ who: 'lantern', text: 'Optional. The holotable mixes its light from three lamps: red, green and blue.' }],
  p7Win: [{ who: 'lantern', text: 'Two lamps mix only the colours on one plane. That colour is off it. No mix of those two lamps can show it.' }],
  close: [
    { who: 'lantern', text: 'Plotting the signal against every point our two thrusters reach.' },
    { who: 'wren', text: 'So we can see him and we can’t get to him.' },
    { who: 'bram', text: 'Not with two thrusters. Give me a spare and somewhere to bolt it.' },
    { who: 'lantern', text: 'Question added to the case board: the signal is off the plane our thrusters reach. How do we get to it?' },
  ],
};
