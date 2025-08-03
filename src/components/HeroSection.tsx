import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, Users, Heart, Volume2 } from "lucide-react";
import familyHeroImage from "@/assets/family-heritage-hero.jpg";

export const HeroSection = () => {
  return (
    <div className="relative min-h-screen bg-gradient-subtle overflow-hidden">
      {/* Hero Content */}
      <div className="container mx-auto px-6 pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold text-heritage-deep leading-tight">
                Keep Your Family's
                <span className="bg-gradient-heritage bg-clip-text text-transparent"> Voice </span>
                Alive Forever
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Transform 15-minute recordings into interactive digital personas. 
                Future generations can have natural conversations with their ancestors, 
                preserving both stories and personality.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="heritage" size="lg" className="text-lg px-8 py-6">
                <Mic className="w-5 h-5 mr-2" />
                Start Recording Stories
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                <Volume2 className="w-5 h-5 mr-2" />
                Experience Demo
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-heritage-gold">15 min</div>
                <div className="text-sm text-muted-foreground">To create persona</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-heritage-gold">∞</div>
                <div className="text-sm text-muted-foreground">Conversations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-heritage-gold">Forever</div>
                <div className="text-sm text-muted-foreground">Preserved</div>
              </div>
            </div>
          </div>

          {/* Right Content - Hero Image */}
          <div className="relative">
            <div className="relative overflow-hidden rounded-3xl shadow-heritage">
              <img 
                src={familyHeroImage} 
                alt="Multiple generations of family sharing stories"
                className="w-full h-[600px] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-heritage-deep/60 via-transparent to-transparent" />
              
              {/* Floating Cards */}
              <Card className="absolute top-6 right-6 p-4 bg-white/90 backdrop-blur-sm shadow-warm animate-float">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-heritage rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">3 Generations</div>
                    <div className="text-xs text-muted-foreground">Connected</div>
                  </div>
                </div>
              </Card>

              <Card className="absolute bottom-6 left-6 p-4 bg-white/90 backdrop-blur-sm shadow-warm" style={{ animationDelay: '2s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-heritage-warm rounded-full flex items-center justify-center animate-heritage-glow">
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Stories Living On</div>
                    <div className="text-xs text-muted-foreground">Forever preserved</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-heritage-soft/30 to-transparent -z-10" />
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-to-tr from-heritage-gold/10 to-transparent -z-10" />
    </div>
  );
};