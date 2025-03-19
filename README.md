# AI Idea Generator

A modern web application built with React, TypeScript, and Google's Generative AI to help users generate and explore creative ideas. The application provides an intuitive interface for interacting with AI to generate, refine, and organize ideas.

## 🚀 Features

- Real-time idea generation using Google's Generative AI
- Multi-model AI system for enhanced idea generation
- Iterative improvement with automatic quality assessment
- Smart prompt enhancement for better results
- Detailed idea ratings and feedback
- Automatic iteration until quality threshold is met

## 🧠 How It Works

The AI Idea Generator uses a sophisticated three-model system that works together to create and refine ideas:

### 1. Prompt Enhancement (First Model)
- Takes the user's initial input and transforms it into an optimized prompt
- Ensures the prompt is properly formatted for idea generation
- Maintains the original intent while maximizing creative potential
- Example: "coffee" → "Generate innovative ideas involving coffee"

### 2. Idea Generation (Second Model)
- Generates 3-5 unique, detailed concepts based on the enhanced prompt
- Each idea includes:
  - A direct, relevant title
  - Professional, detailed explanation (2-3 paragraphs)
- Ensures ideas are varied and not too similar to each other
- Balances between innovative concepts and immediately implementable ideas
- At least 50% of ideas are practical and feasible with current technology

### 3. Idea Evaluation (Third Model)
- Objectively evaluates each set of generated ideas
- Provides three key metrics:
  - Individual ratings (0-100) for each idea
  - Specific improvement feedback
  - Overall score (A++, A+, A, B, or C)
- Evaluation criteria:
  - 40% Alignment with user's intent
  - 30% Innovation within context
  - 30% Clarity and accessibility

### 4. Iterative Improvement Loop
The system automatically goes through multiple iterations to improve the ideas:
1. Minimum of 2 iterations (unless A++ is achieved)
2. Maximum of 5 iterations
3. Continues iterating if:
   - Not reached maximum iterations
   - Shows 5% or more improvement between iterations
   - Hasn't achieved an A++ rating
4. Each new iteration:
   - Uses previous feedback to generate completely new ideas
   - Ensures no duplicate or similar ideas from previous iterations
   - Maintains theme while exploring fresh approaches

### 5. Quality Control
- Tracks best-performing ideas across all iterations
- Uses a scoring system (A++ = 5, A+ = 4, A = 3, B = 2, C = 1)
- Compares average ratings when scores are equal
- Stores complete iteration history for reference
- Validates all AI responses to ensure proper formatting

### 6. Final Output
The system provides:
- The best set of ideas from all iterations
- Final improvement feedback
- Complete iteration history
- Performance metrics and scores
- Original and enhanced prompts

This automated system ensures high-quality, relevant ideas through continuous improvement and objective evaluation, requiring no manual intervention during the refinement process.

## 🛠️ Tech Stack

- **Frontend Framework**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI Integration**: Google Generative AI
- **Build Tool**: Vite
- **Package Manager**: npm
- **Code Quality**: ESLint
- **Markdown Rendering**: react-markdown
- **Deployment**: Vercel serverless functions

## 🌐 API Routes

The application uses serverless API routes hosted on Vercel:

### `/api/gemini.js`

The main API endpoint that integrates with Google's Generative AI (Gemini) to process idea generation requests:

- Handles idea generation, enhancement, and evaluation
- Implements rate limiting (10 requests per minute)
- Validates request origins
- Supports multiple environments (production, preview, development)

### `/api/test.js`

A diagnostic endpoint to verify API functionality:

- Returns basic environment information
- Confirms API route is working
- Shows available environment variables (safely masked)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (Latest LTS version recommended)
- npm (comes with Node.js)

## 🔧 Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd ai-idea-generator
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory and add your API keys:
```env
GEMINI_API_KEY=your_api_key_here
VITE_GEMINI_API_KEY=your_api_key_here
VITE_PROMPT_ENHANCER_MODEL=gemini-2.0-flash-lite
VITE_IDEA_GENERATOR_MODEL=gemini-2.0-flash
VITE_CRITIC_MODEL=gemini-2.0-flash-lite
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 📝 Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run lint` - Run ESLint to check code quality
- `npm run preview` - Preview the production build locally

## 🏗️ Project Structure

```
ai-idea-generator/
├── api/              # Serverless API functions
│   ├── gemini.js     # Main Gemini AI integration endpoint
│   └── test.js       # Diagnostic endpoint
├── src/
│   ├── components/   # React components
│   ├── context/      # React context providers
│   ├── utils/        # Utility functions
│   ├── types.ts      # TypeScript type definitions
│   ├── App.tsx       # Main application component
│   └── main.tsx      # Application entry point
├── public/           # Static assets
└── [configuration files]
```

## 🔒 Environment Variables

The following environment variables are required:

- `GEMINI_API_KEY` - Google Generative AI API key (server-side)
- `VITE_GEMINI_API_KEY` - Google Generative AI API key (client-side)
- `VITE_PROMPT_ENHANCER_MODEL` - Model to use for prompt enhancement (e.g., "gemini-2.0-flash-lite")
- `VITE_IDEA_GENERATOR_MODEL` - Model to use for idea generation (e.g., "gemini-2.0-flash")
- `VITE_CRITIC_MODEL` - Model to use for idea evaluation (e.g., "gemini-2.0-flash-lite")
- `VITE_OPENAI_API_KEY` - Optional OpenAI API key (if OpenAI integration is used)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Google Generative AI](https://ai.google.dev/) for providing the AI capabilities
- [Lucide React](https://lucide.dev/) for the beautiful icons
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [Vite](https://vitejs.dev/) for the blazing fast build tool

## 🤔 Support

For support, please open an issue in the GitHub repository or contact the maintainers.

---

Made with ❤️ using React and Google's Generative AI 