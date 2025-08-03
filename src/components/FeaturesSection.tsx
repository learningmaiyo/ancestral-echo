import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MessageCircle, Users, Shield, Clock, Heart } from "lucide-react";
import recordingIcon from "@/assets/recording-icon.jpg";
import digitalTreeImage from "@/assets/digital-family-tree.jpg";

export const FeaturesSection = () => {
  const features = [
    {
      icon: <Mic className="w-8 h-8" />,
      title: "Guided Recording",
      description: "15-minute sessions with thoughtful prompts to capture your loved one's essence, stories, and personality.",
      color: "heritage-gold"
    },
    {
      icon: <MessageCircle className="w-8 h-8" />,
      title: "Natural Conversations",
      description: "AI-powered personas that respond like the actual person, using their voice and speaking patterns.",
      color: "heritage-warm"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Family Tree",
      description: "Connect multiple generations in an interactive family tree where every member can share their story.",
      color: "heritage-gold"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Secure & Private",
      description: "Your family's stories are encrypted and protected with enterprise-grade security measures.",
      color: "heritage-warm"
    },
    {
      icon: <Clock className="w-8 h-8" />,
      title: "Always Available",
      description: "Access your family's wisdom and stories anytime, anywhere, across all your devices.",
      color: "heritage-gold"
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: "Emotional Connection",
      description: "Preserve not just words, but the emotional nuances that make each family member unique.",
      color: "heritage-warm"
    }
  ];

  return (
    <div className="py-20 bg-background">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-heritage-deep mb-4">
            How Digital Storyteller Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Three simple steps to preserve your family's legacy and create meaningful connections 
            across generations through the power of AI and voice technology.
          </p>
        </div>

        {/* Process Steps */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <Card className="relative bg-gradient-card border-heritage-gold/20 shadow-soft hover:shadow-warm transition-all duration-300">
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-heritage flex items-center justify-center shadow-heritage">
                <img src={recordingIcon} alt="Recording" className="w-12 h-12 rounded-full" />
              </div>
              <div className="absolute top-4 right-4 w-8 h-8 bg-heritage-gold text-white rounded-full flex items-center justify-center font-bold">1</div>
              <CardTitle className="text-heritage-deep">Record Stories</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-base">
                Use our guided prompts to record 15-20 minutes of stories, memories, 
                and wisdom from your family member.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="relative bg-gradient-card border-heritage-warm/20 shadow-soft hover:shadow-warm transition-all duration-300">
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-heritage-warm flex items-center justify-center shadow-warm">
                <MessageCircle className="w-12 h-12 text-white" />
              </div>
              <div className="absolute top-4 right-4 w-8 h-8 bg-heritage-warm text-white rounded-full flex items-center justify-center font-bold">2</div>
              <CardTitle className="text-heritage-deep">AI Processing</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-base">
                Our AI analyzes speech patterns, personality traits, and stories to create 
                a digital persona that speaks like them.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="relative bg-gradient-card border-heritage-gold/20 shadow-soft hover:shadow-warm transition-all duration-300">
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden shadow-heritage">
                <img src={digitalTreeImage} alt="Family Tree" className="w-full h-full object-cover" />
              </div>
              <div className="absolute top-4 right-4 w-8 h-8 bg-heritage-gold text-white rounded-full flex items-center justify-center font-bold">3</div>
              <CardTitle className="text-heritage-deep">Start Conversations</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <CardDescription className="text-base">
                Begin meaningful conversations with your loved ones' digital personas 
                using their authentic voice and personality.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="bg-gradient-card border-heritage-soft shadow-soft hover:shadow-warm transition-all duration-300 group">
              <CardHeader className="pb-4">
                <div className={`w-12 h-12 rounded-full bg-${feature.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <CardTitle className="text-heritage-deep">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};