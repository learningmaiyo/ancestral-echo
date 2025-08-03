import { Button } from "@/components/ui/button";
import { Mic, Users, Menu } from "lucide-react";
import { useState } from "react";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-heritage-soft shadow-soft">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-heritage rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-heritage-deep">Digital Storyteller</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-heritage-deep transition-colors">
              How It Works
            </a>
            <a href="#demo" className="text-muted-foreground hover:text-heritage-deep transition-colors">
              Demo
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-heritage-deep transition-colors">
              Pricing
            </a>
            <a href="#about" className="text-muted-foreground hover:text-heritage-deep transition-colors">
              About
            </a>
          </nav>

          {/* Desktop Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost">
              Sign In
            </Button>
            <Button variant="heritage">
              <Mic className="w-4 h-4 mr-2" />
              Start Recording
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-heritage-soft bg-white/95 backdrop-blur-sm">
            <nav className="py-4 space-y-4">
              <a href="#features" className="block text-muted-foreground hover:text-heritage-deep transition-colors">
                How It Works
              </a>
              <a href="#demo" className="block text-muted-foreground hover:text-heritage-deep transition-colors">
                Demo
              </a>
              <a href="#pricing" className="block text-muted-foreground hover:text-heritage-deep transition-colors">
                Pricing
              </a>
              <a href="#about" className="block text-muted-foreground hover:text-heritage-deep transition-colors">
                About
              </a>
              <div className="pt-4 space-y-2">
                <Button variant="ghost" className="w-full justify-start">
                  Sign In
                </Button>
                <Button variant="heritage" className="w-full justify-start">
                  <Mic className="w-4 h-4 mr-2" />
                  Start Recording
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};