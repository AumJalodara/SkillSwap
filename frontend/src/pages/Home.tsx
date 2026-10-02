import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Users, Star } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center space-y-16 py-12">
      {/* Hero Section */}
      <section className="text-center space-y-6 max-w-3xl">
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight">
          Exchange Skills, <span className="text-indigo-600">Not Money.</span>
        </h1>
        <p className="text-xl text-slate-600 leading-relaxed">
          SkillSwap is a peer-to-peer learning platform where you can teach what you know to earn credits, and spend them to learn what you don't.
        </p>
        <div className="flex justify-center space-x-4 pt-4">
          <Link to="/register" className="flex items-center space-x-2 bg-indigo-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
            <span>Get Started</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link to="/discover" className="flex items-center space-x-2 bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-50 transition-all shadow-sm">
            <span>Explore Skills</span>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="grid md:grid-cols-3 gap-8 w-full pt-8">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center space-y-4 transition-transform hover:-translate-y-1">
          <div className="bg-indigo-50 p-4 rounded-full text-indigo-600">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Smart Matching</h3>
          <p className="text-slate-600">Our algorithm finds the perfect reciprocal learning opportunities for you.</p>
        </div>
        
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center space-y-4 transition-transform hover:-translate-y-1">
          <div className="bg-emerald-50 p-4 rounded-full text-emerald-600">
            <Star className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Skill Credits</h3>
          <p className="text-slate-600">Earn credits by teaching, and spend them to learn from others in the community.</p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center space-y-4 transition-transform hover:-translate-y-1">
          <div className="bg-amber-50 p-4 rounded-full text-amber-600">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Grow Together</h3>
          <p className="text-slate-600">Build your portfolio, get rated by peers, and master new skills interactively.</p>
        </div>
      </section>
    </div>
  );
}
