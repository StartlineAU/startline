"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import startlineLogo from "@/startline-logo-black.jpg";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const onScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY <= 8) {
        setIsVisible(true);
        lastScrollY = currentScrollY;
        return;
      }

      if (isMenuOpen) {
        setIsVisible(true);
        lastScrollY = currentScrollY;
        return;
      }

      if (currentScrollY > lastScrollY) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMenuOpen]);

  return (
    <header
      className={`bg-dark-darker border-b border-dark-light fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded overflow-hidden bg-white">
              <Image
                src={startlineLogo}
                alt="StartLine logo"
                width={32}
                height={32}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <span className="text-xl font-bold text-white">StartLine</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/events"
              className="text-muted hover:text-primary transition-colors duration-200 text-sm font-medium"
            >
              All Competitions
            </Link>
            <Link
              href="/events?type=hyrox"
              className="text-muted hover:text-primary transition-colors duration-200 text-sm font-medium"
            >
              HYROX
            </Link>
            <Link
              href="/events?type=crossfit"
              className="text-muted hover:text-primary transition-colors duration-200 text-sm font-medium"
            >
              CrossFit
            </Link>
            <Link
              href="/events?type=running"
              className="text-muted hover:text-primary transition-colors duration-200 text-sm font-medium"
            >
              Running
            </Link>
            <Link
              href="/events"
              className="bg-primary text-dark px-4 py-2 rounded font-semibold text-sm hover:bg-primary-light transition-colors duration-200"
            >
              Find Competitions
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded hover:bg-dark-light transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Menu className="w-6 h-6 text-white" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-dark-light animate-fade-in">
            <div className="flex flex-col space-y-3">
              <Link
                href="/events"
                className="text-muted hover:text-primary transition-colors duration-200 py-2 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                All Competitions
              </Link>
              <Link
                href="/events?type=hyrox"
                className="text-muted hover:text-primary transition-colors duration-200 py-2 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                HYROX
              </Link>
              <Link
                href="/events?type=crossfit"
                className="text-muted hover:text-primary transition-colors duration-200 py-2 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                CrossFit
              </Link>
              <Link
                href="/events?type=running"
                className="text-muted hover:text-primary transition-colors duration-200 py-2 font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Running
              </Link>
              <Link
                href="/events"
                className="bg-primary text-dark px-4 py-3 rounded font-semibold text-center hover:bg-primary-light transition-colors duration-200 mt-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Find Competitions
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
