import React, { useState } from 'react';
import { ArrowLeft, Clock, MessageSquare, Share2, Twitter, Facebook, Link, Check, Send, ThumbsUp, ThumbsDown, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Article, Comment } from '../data/mockArticles';

interface ArticleDetailProps {
  article: Article;
  onBack: () => void;
  onArticleClick: (id: string) => void;
  relatedArticles: Article[];
}

export const ArticleDetail: React.FC<ArticleDetailProps> = ({ article, onBack, onArticleClick, relatedArticles }) => {
  const { title, subtitle, summary, content, category, author, date, time, image, readTime, source } = article;

  // State for comments
  const [comments, setComments] = useState<Comment[]>(article.comments);
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentAuthor, setNewCommentAuthor] = useState('');
  const [commentError, setCommentError] = useState('');
  const [commentSuccess, setCommentSuccess] = useState(false);

  // State for reactions
  const [reactions, setReactions] = useState(article.reactions);
  const [userReaction, setUserReaction] = useState<string | null>(null);

  // State for share copy toast
  const [showShareToast, setShowShareToast] = useState(false);

  const handleReactionClick = (type: 'like' | 'surprised' | 'angry' | 'sad' | 'proud') => {
    if (userReaction === type) {
      // Undo reaction
      setReactions(prev => ({ ...prev, [type]: prev[type] - 1 }));
      setUserReaction(null);
    } else {
      // If there was a previous reaction, undo it first
      const updated = { ...reactions };
      if (userReaction) {
        updated[userReaction as keyof typeof reactions] -= 1;
      }
      // Add new reaction
      updated[type] += 1;
      setReactions(updated);
      setUserReaction(type);
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) {
      setCommentError('Comment text cannot be empty.');
      return;
    }

    const authorName = newCommentAuthor.trim() || 'Anonymous_ZAR';

    const newComment: Comment = {
      id: `new-${Date.now()}`,
      author: authorName,
      text: newCommentText.trim(),
      date: 'Just now',
      upvotes: 1,
      downvotes: 0
    };

    setComments(prev => [newComment, ...prev]);
    setNewCommentText('');
    setNewCommentAuthor('');
    setCommentError('');
    setCommentSuccess(true);
    setTimeout(() => setCommentSuccess(false), 3000);
  };

  const handleCommentVote = (commentId: string, isUpvote: boolean) => {
    setComments(prev =>
      prev.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            upvotes: isUpvote ? c.upvotes + 1 : c.upvotes,
            downvotes: !isUpvote ? c.downvotes + 1 : c.downvotes
          };
        }
        return c;
      })
    );
  };

  const copyArticleLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 2500);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden max-w-4xl mx-auto">
      {/* Article Header Actions */}
      <div className="border-b border-gray-100 p-4 flex items-center justify-between bg-slate-50">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-red-700 transition-colors uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to News Feed
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 bg-gray-200 px-2 py-0.5 rounded uppercase font-sans">
            {source}
          </span>
        </div>
      </div>

      {/* Article Content */}
      <article className="p-4 sm:p-8 space-y-6">
        {/* Category & Meta */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-500">
          <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-100 rounded font-bold uppercase tracking-wider">
            {category}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {readTime}
          </span>
          <span>•</span>
          <span>Published {date} at {time}</span>
        </div>

        {/* Title & Subtitle */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight tracking-tight font-sans">
            {title}
          </h1>
          <p className="text-lg sm:text-xl font-bold text-gray-500 leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Author Bio */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
          <div className="flex items-center gap-3">
            <img src={author.avatar} alt={author.name} className="w-12 h-12 rounded-full object-cover border border-white shadow-sm" />
            <div>
              <span className="text-sm font-extrabold text-gray-900 block">{author.name}</span>
              <span className="text-xs text-gray-500 block">{author.role}</span>
            </div>
          </div>

          {/* Social Share Group */}
          <div className="flex items-center gap-1.5 relative">
            <button
              onClick={copyArticleLink}
              title="Copy Link"
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-all cursor-pointer"
            >
              <Link className="w-4 h-4" />
            </button>
            <button
              onClick={() => alert('Simulated sharing to Twitter/X')}
              className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-all cursor-pointer"
            >
              <Twitter className="w-4 h-4" />
            </button>
            <button
              onClick={() => alert('Simulated sharing to Facebook')}
              className="p-2 text-gray-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-all cursor-pointer"
            >
              <Facebook className="w-4 h-4" />
            </button>

            {/* Copy Link Toast */}
            <AnimatePresence>
              {showShareToast && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 bottom-12 bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded shadow-lg flex items-center gap-1.5 whitespace-nowrap z-50"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Link copied to clipboard!
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Hero Image */}
        <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
          <img src={image} alt={title} className="w-full max-h-[450px] object-cover" />
          <div className="bg-slate-50 px-4 py-2 text-xs text-gray-500 italic border-t border-gray-100 flex justify-between">
            <span>Photo: {author.name} / 180news Archive</span>
            <span>South Africa, 2026</span>
          </div>
        </div>

        {/* Summary Box */}
        <div className="p-4 sm:p-5 bg-red-50/40 border-l-4 border-red-700 rounded-r-lg">
          <p className="text-sm sm:text-base font-bold text-gray-800 leading-relaxed">
            {summary}
          </p>
        </div>

        {/* Article Body Content */}
        <div className="prose prose-slate max-w-none text-gray-800 leading-relaxed space-y-5 font-serif text-base sm:text-lg">
          {content.map((paragraph, idx) => {
            // Apply a drop cap to the first paragraph
            if (idx === 0) {
              return (
                <p key={idx} className="first-letter:text-5xl first-letter:font-extrabold first-letter:text-red-700 first-letter:mr-3 first-letter:float-left first-letter:leading-4 pt-1">
                  {paragraph}
                </p>
              );
            }
            // Insert a realistic pull-quote in the middle of long articles
            if (idx === Math.floor(content.length / 2)) {
              return (
                <React.Fragment key={idx}>
                  <blockquote className="border-l-4 border-blue-900 pl-4 py-1.5 my-6 italic font-bold text-blue-950 text-lg sm:text-xl font-sans bg-blue-50/30 rounded-r pr-4">
                    "This is a turning point for South Africa. We are witnessing a structural shift that will redefine our economic trajectory over the next decade."
                  </blockquote>
                  <p>{paragraph}</p>
                </React.Fragment>
              );
            }
            return <p key={idx}>{paragraph}</p>;
          })}
        </div>

        {/* Interactive Reactions */}
        <div className="pt-6 border-t border-gray-100">
          <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider mb-3">How does this article make you feel?</h4>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => handleReactionClick('like')}
              className={`px-3.5 py-2 rounded-full border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                userReaction === 'like'
                  ? 'bg-red-50 border-red-200 text-red-700 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>Like</span>
              <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px] font-mono">{reactions.like}</span>
            </button>

            <button
              onClick={() => handleReactionClick('surprised')}
              className={`px-3.5 py-2 rounded-full border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                userReaction === 'surprised'
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-700 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>😲</span>
              <span>Surprised</span>
              <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px] font-mono">{reactions.surprised}</span>
            </button>

            <button
              onClick={() => handleReactionClick('angry')}
              className={`px-3.5 py-2 rounded-full border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                userReaction === 'angry'
                  ? 'bg-orange-50 border-orange-200 text-orange-700 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>😡</span>
              <span>Angry</span>
              <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px] font-mono">{reactions.angry}</span>
            </button>

            <button
              onClick={() => handleReactionClick('sad')}
              className={`px-3.5 py-2 rounded-full border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                userReaction === 'sad'
                  ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>😢</span>
              <span>Sad</span>
              <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px] font-mono">{reactions.sad}</span>
            </button>

            <button
              onClick={() => handleReactionClick('proud')}
              className={`px-3.5 py-2 rounded-full border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                userReaction === 'proud'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>Proud</span>
              <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px] font-mono">{reactions.proud}</span>
            </button>
          </div>
        </div>

        {/* Comments Section */}
        <div className="pt-8 border-t border-gray-100 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wide flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-red-600" />
              Comments ({comments.length})
            </h3>
            <span className="text-xs text-gray-400 font-medium">Please adhere to our community guidelines.</span>
          </div>

          {/* Comment Form */}
          <form onSubmit={handleCommentSubmit} className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Your Nickname</label>
                <input
                  type="text"
                  placeholder="e.g. BraaiMaster_ZAR"
                  value={newCommentAuthor}
                  onChange={(e) => setNewCommentAuthor(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded px-3 py-1.5 text-xs focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Your Comment</label>
              <textarea
                rows={3}
                placeholder="Join the discussion..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded p-3 text-xs focus:border-red-500 focus:outline-none resize-none"
              />
            </div>

            {commentError && <p className="text-red-600 text-xs font-semibold">{commentError}</p>}

            <div className="flex justify-between items-center pt-1">
              <span className="text-[10px] text-gray-400">Comments are moderated post-publication.</span>
              <button
                type="submit"
                className="py-1.5 px-4 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Post Comment
              </button>
            </div>

            {/* Success alert */}
            <AnimatePresence>
              {commentSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-emerald-50 text-emerald-800 text-xs font-medium p-2.5 rounded border border-emerald-100 flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-emerald-600" />
                  Comment posted successfully!
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          {/* Comments List */}
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="p-4 border border-gray-100 rounded-lg bg-white space-y-2.5 shadow-2xs">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs font-mono">
                      {comment.author.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-xs text-gray-800">{comment.author}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">{comment.date}</span>
                </div>

                <p className="text-xs text-gray-700 leading-relaxed pl-9">
                  {comment.text}
                </p>

                <div className="flex items-center gap-3 pl-9 pt-1.5">
                  <button
                    onClick={() => handleCommentVote(comment.id, true)}
                    className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-emerald-600 transition-colors cursor-pointer"
                  >
                    <ThumbsUp className="w-3 h-3" />
                    <span>{comment.upvotes}</span>
                  </button>
                  <button
                    onClick={() => handleCommentVote(comment.id, false)}
                    className="flex items-center gap-1 text-[10px] font-bold text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <ThumbsDown className="w-3 h-3" />
                    <span>{comment.downvotes}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </article>

      {/* Related Articles Footer Section */}
      {relatedArticles.length > 0 && (
        <div className="bg-slate-50 border-t border-gray-100 p-6 sm:p-8 space-y-4">
          <h3 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider font-sans">Related Articles</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {relatedArticles.map(rel => (
              <div
                key={rel.id}
                onClick={() => onArticleClick(rel.id)}
                className="group cursor-pointer bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-all duration-200"
              >
                <div className="h-28 rounded overflow-hidden mb-2">
                  <img src={rel.image} alt={rel.title} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300" />
                </div>
                <span className="text-[9px] font-bold text-red-700 uppercase block mb-1">{rel.category}</span>
                <h4 className="font-bold text-xs text-gray-900 group-hover:text-red-700 transition-colors line-clamp-2 leading-snug">
                  {rel.title}
                </h4>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
