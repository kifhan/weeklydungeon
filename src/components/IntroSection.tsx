import React from 'react';
import { Button } from './ui/Button';
import { MapPin, Brain, Shield, Target } from 'lucide-react';

interface IntroSectionProps {
  onSignIn: () => void;
  onSignInAnon: () => void;
  authError: string | null;
  signingIn: boolean;
}

export function IntroSection({ onSignIn, onSignInAnon, authError, signingIn }: IntroSectionProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center">
        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
            🗺️ Weekly Dungeon
          </h1>
          <p className="text-1xl text-gray-600 dark:text-gray-300 mb-8">
            Transform your life into an epic RPG adventure
          </p>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            Level up your productivity with our unique combination of weekly dungeon mapping
            and daily habit tracking. Turn mundane tasks into exciting quests!
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 gap-8 mb-8">
          <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-center mb-4">
              <MapPin className="w-12 h-12 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              Weekly Dungeon Map
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Visualize your week as an RPG dungeon. Plan quests, navigate challenges,
              and conquer your goals with strategic thinking.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-center mb-4">
              <Brain className="w-12 h-12 text-purple-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              Daily Habit Tracker
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Track your daily state and build lasting habits. Monitor your progress
              and maintain consistency in your personal development journey.
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className="flex justify-center gap-8 mb-8 flex-wrap">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <Shield className="w-5 h-5 text-green-500" />
            <span>Secure Google Auth</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <Target className="w-5 h-5 text-red-500" />
            <span>Goal-Oriented Design</span>
          </div>
        </div>

        {/* Sign In Section */}
        <div className="bg-white dark:bg-gray-700 p-8 rounded-lg shadow-lg max-w-md mx-auto">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
            Ready to Begin Your Quest?
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Sign in with Google to start your adventure and unlock your potential.
          </p>

          {authError && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {authError}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button
              onClick={onSignIn}
              disabled={signingIn}
              className="w-full text-lg py-3"
            >
              {signingIn ? 'Signing in...' : '🚀 Sign in with Google'}
            </Button>
            <Button
              onClick={onSignInAnon}
              disabled={signingIn}
              variant="outline"
              className="w-full text-lg py-3"
            >
              {signingIn ? 'Loading...' : 'Continue as Guest'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}