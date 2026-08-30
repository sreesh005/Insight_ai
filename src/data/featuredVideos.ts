import { FeaturedVideo } from '../types';

export const FEATURED_VIDEOS: FeaturedVideo[] = [
  {
    id: 'zjkBMFhNj_g',
    title: 'Intro to Large Language Models (LLMs)',
    channelTitle: 'Andrej Karpathy',
    subscriberCount: '1.1M',
    publishDate: '1 year ago',
    duration: '1:00:00',
    durationSeconds: 3600,
    thumbnailUrl: 'https://img.youtube.com/vi/zjkBMFhNj_g/hqdefault.jpg',
    description: 'A 1-hour general audience introduction to Large Language Models: what they are, how they are trained, fine-tuned, and how they think and reason.',
    chapters: [
      { time: 0, formattedTime: '00:00', title: 'LLM Inference & Architecture', description: 'Overview of Llama 2 70B parameter model weights and files.' },
      { time: 540, formattedTime: '09:00', title: 'How LLMs are Trained (Pretraining)', description: 'Scraping the internet, chunking text, and running massive GPU clusters.' },
      { time: 1320, formattedTime: '22:00', title: 'Fine-Tuning & RLHF', description: 'Supervised fine-tuning with human contractors and reinforcement learning.' },
      { time: 2100, formattedTime: '35:00', title: 'LLM Reasoning & Thinking', description: 'System 1 vs System 2 thinking, chain of thought, and tree search.' },
      { time: 2880, formattedTime: '48:00', title: 'Security & Jailbreaking', description: 'Prompt injection, data poisoning, and safety alignments.' }
    ],
    suggestedQuestions: [
      'How does pretraining differ from fine-tuning?',
      'What is RLHF and why is human feedback necessary?',
      'How do LLMs suffer from prompt injection attacks?',
      'What is System 1 vs System 2 thinking in AI?'
    ],
    transcript: [
      { start: 0, duration: 15, formattedTime: '00:00', text: 'Hi everyone, welcome to this intro to Large Language Models. Today we will explore what LLMs actually are under the hood.' },
      { start: 15, duration: 25, formattedTime: '00:15', text: 'An LLM like Llama 2 70B is really just two files: a parameters file containing float16 numbers and a run file written in C or Python.' },
      { start: 40, duration: 30, formattedTime: '00:40', text: 'The parameter weights file is around 140 gigabytes. It compresses billions of web pages into mathematical neural connections.' },
      { start: 70, duration: 35, formattedTime: '01:10', text: 'When you prompt an LLM, it predicts the very next token or word probability distribution based on its transformer architecture.' },
      { start: 540, duration: 40, formattedTime: '09:00', text: 'Stage 1 of building an LLM is Pre-training. We collect roughly 10 trillion words from internet crawls like Common Crawl.' },
      { start: 580, duration: 35, formattedTime: '09:40', text: 'Pre-training takes thousands of GPUs running for months, costing tens of millions of dollars in electricity and compute.' },
      { start: 615, duration: 45, formattedTime: '10:15', text: 'The result of pre-training is a Base Model. A Base Model is an internet document completer. It is not yet a helpful assistant.' },
      { start: 1320, duration: 40, formattedTime: '22:00', text: 'To transform a Base Model into an Assistant Model, we perform Supervised Fine-Tuning (SFT).' },
      { start: 1360, duration: 50, formattedTime: '22:40', text: 'Human labelers write thousands of high-quality ideal responses to user prompts. The model learns conversation patterns.' },
      { start: 1410, duration: 45, formattedTime: '23:25', text: 'Next comes RLHF: Reinforcement Learning from Human Feedback, where humans rank model responses to tune reward models.' },
      { start: 2100, duration: 50, formattedTime: '35:00', text: 'Let us discuss LLM reasoning. Standard next-token prediction is like System 1 instinctual fast thinking.' },
      { start: 2150, duration: 45, formattedTime: '35:50', text: 'When we give the model working scratchpad space—like asking it to think step-by-step—it unlocks System 2 deliberate reasoning.' },
      { start: 2880, duration: 40, formattedTime: '48:00', text: 'Security is a major challenge. Prompt injection allows malicious instructions embedded in web pages to hijack AI actions.' },
      { start: 2920, duration: 35, formattedTime: '48:40', text: 'We also have jailbreaking, where users trick the model into overriding its safety alignment guardrails.' }
    ]
  },
  {
    id: 'k1x4e3eQd30',
    title: 'But what is a Neural Network? | Deep learning, chapter 1',
    channelTitle: '3Blue1Brown',
    subscriberCount: '6.2M',
    publishDate: '6 years ago',
    duration: '19:13',
    durationSeconds: 1153,
    thumbnailUrl: 'https://img.youtube.com/vi/k1x4e3eQd30/hqdefault.jpg',
    description: 'An intuitive visual introduction to Neural Networks, deep learning, weights, biases, activations, and mathematical foundations behind modern AI models.',
    chapters: [
      { time: 0, formattedTime: '00:00', title: 'What are Neurons & Activations?', description: 'Concept of a neuron holding a number between 0 and 1.' },
      { time: 200, formattedTime: '03:20', title: 'Layers & Pattern Recognition', description: 'Hidden layers breaking down digits into edges and sub-components.' },
      { time: 540, formattedTime: '09:00', title: 'Weights & Biases (The Math)', description: 'Matrix multiplications, weighted sums, and sigmoid activation function.' },
      { time: 820, formattedTime: '13:40', title: 'Cost Functions & Learning', description: 'Quantifying network errors to calculate gradient descent.' }
    ],
    suggestedQuestions: [
      'What is a neuron in the context of deep learning?',
      'How do hidden layers recognize patterns like handwritten digits?',
      'What role do weights and biases play in neural activation?',
      'How does the cost function measure network performance?'
    ],
    transcript: [
      { start: 0, duration: 20, formattedTime: '00:00', text: 'Welcome to Chapter 1 of Deep Learning. What is a neural network?' },
      { start: 20, duration: 25, formattedTime: '00:20', text: 'When you hear neural network, think of a network of neurons inspired by the brain. Each neuron holds a number called its activation.' },
      { start: 45, duration: 30, formattedTime: '00:45', text: 'For handwritten digit recognition, the input layer has 784 neurons corresponding to 28 by 28 pixel intensities.' },
      { start: 200, duration: 40, formattedTime: '03:20', text: 'The network fires activations through hidden layers. The second layer detects small edges, and the third layer assembles those edges into loops or strokes.' },
      { start: 240, duration: 35, formattedTime: '04:00', text: 'Finally, the output layer consists of 10 neurons, each representing a digit candidate from 0 to 9.' },
      { start: 540, duration: 45, formattedTime: '09:00', text: 'Connections between neurons are defined by weights. A weight is just a number assigned to each connection line.' },
      { start: 585, duration: 40, formattedTime: '09:45', text: 'We compute a weighted sum of all incoming activations, add a bias term, and compress the result through a Sigmoid activation function.' },
      { start: 820, duration: 50, formattedTime: '13:40', text: 'To train the network, we define a Cost Function. It measures the sum of squared differences between network predictions and true target labels.' }
    ]
  },
  {
    id: 'AirCRas_J3k',
    title: 'How Quantum Computers Work - Simply Explained',
    channelTitle: 'Kurzgesagt - In a Nutshell',
    subscriberCount: '22M',
    publishDate: '2 years ago',
    duration: '10:15',
    durationSeconds: 615,
    thumbnailUrl: 'https://img.youtube.com/vi/AirCRas_J3k/hqdefault.jpg',
    description: 'Quantum computing explained simply: qubits, superposition, entanglement, and how quantum computers solve exponential problems.',
    chapters: [
      { time: 0, formattedTime: '00:00', title: 'Classical Bits vs Quantum Qubits', description: 'Bits are 0 or 1; qubits exist in superposition.' },
      { time: 180, formattedTime: '03:00', title: 'Quantum Superposition & Entanglement', description: 'Simultaneous states and linked quantum particles.' },
      { time: 390, formattedTime: '06:30', title: 'Quantum Algorithms & Shor algorithm', description: 'Factoring huge numbers and breaking encryption.' },
      { time: 510, formattedTime: '08:30', title: 'Decoherence & Hardware Challenges', description: 'Extreme cooling and noise interference.' }
    ],
    suggestedQuestions: [
      'What is superposition in quantum computing?',
      'How does quantum entanglement allow qubits to interact?',
      'Why are classical computers unable to solve quantum chemistry problems quickly?',
      'What is decoherence and why must quantum chips be frozen?'
    ],
    transcript: [
      { start: 0, duration: 20, formattedTime: '00:00', text: 'Every computer you use today processes information in classical bits: transistors representing either a 0 or a 1.' },
      { start: 20, duration: 25, formattedTime: '00:20', text: 'Quantum computers use qubits. Thanks to superposition, a qubit can exist in a state of 0, 1, or any proportion of both simultaneously.' },
      { start: 180, duration: 35, formattedTime: '03:00', text: 'Superposition allows 4 qubits to hold 16 values at once. With 300 qubits, you can process more numbers simultaneously than atoms in the observable universe.' },
      { start: 215, duration: 40, formattedTime: '03:35', text: 'The second key principle is Entanglement. When qubits entangle, measuring one instantly determines the state of its paired partner.' },
      { start: 390, duration: 45, formattedTime: '06:30', text: 'Quantum algorithms like Shor Algorithm exploit wave interference to cancel out wrong answers and amplify the correct solution.' },
      { start: 510, duration: 40, formattedTime: '08:30', text: 'The hardest challenge is Decoherence. Tiny heat or electromagnetic vibrations collapse superposition, causing errors.' }
    ]
  }
];
