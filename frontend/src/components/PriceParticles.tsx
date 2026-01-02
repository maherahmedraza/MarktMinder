'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useTheme } from 'next-themes';

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    type: 'deal' | 'rise' | 'neutral';
    alpha: number;
    pulse: number;
    pulseSpeed: number;
}

interface PriceParticlesProps {
    className?: string;
    particleCount?: number;
    interactive?: boolean;
}

/**
 * PriceParticles - Interactive Canvas Background
 * 
 * Concept: "Price Flow" - Visualizes the flow of prices across marketplaces
 * - Green particles = deals/price drops (float upward)
 * - Red particles = price increases (sink down)
 * - Blue/Purple particles = stable prices (drift)
 * - Mouse interaction reveals hidden connections
 * 
 * Supports both light and dark themes
 */
export function PriceParticles({
    className = '',
    particleCount = 60,
    interactive = true
}: PriceParticlesProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const mouseRef = useRef({ x: 0, y: 0, active: false });
    const animationRef = useRef<number | null>(null);
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Track theme to trigger re-render
    const isDark = mounted && resolvedTheme === 'dark';

    useEffect(() => {
        setMounted(true);
    }, []);

    // Color palettes for light and dark modes
    const getColors = useCallback(() => {
        if (isDark) {
            return {
                deal: { r: 0, g: 223, b: 162 },      // Mint - bright on dark
                rise: { r: 255, g: 107, b: 107 },    // Coral - bright on dark
                neutral: { r: 122, g: 146, b: 255 }, // Primary blue - bright on dark
                connection: { r: 122, g: 146, b: 255, a: 0.15 },
                clearColor: 'rgba(13, 15, 26, 0.1)',
                mouseGlow: { r: 122, g: 146, b: 255 },
            };
        } else {
            // Light mode - deeper, more saturated colors
            return {
                deal: { r: 5, g: 150, b: 105 },      // Deeper green
                rise: { r: 220, g: 38, b: 38 },       // Deeper red
                neutral: { r: 79, g: 70, b: 229 },   // Indigo
                connection: { r: 79, g: 70, b: 229, a: 0.2 },
                clearColor: 'rgba(248, 250, 252, 0.15)',
                mouseGlow: { r: 79, g: 70, b: 229 },
            };
        }
    }, [isDark]);

    const initParticles = useCallback((width: number, height: number) => {
        const particles: Particle[] = [];

        for (let i = 0; i < particleCount; i++) {
            // Weighted distribution: more deals than rises
            const rand = Math.random();
            let type: 'deal' | 'rise' | 'neutral';
            if (rand < 0.45) type = 'deal';
            else if (rand < 0.65) type = 'rise';
            else type = 'neutral';

            // Higher alpha for light mode
            const baseAlpha = isDark ? 0.2 : 0.4;
            const alphaRange = isDark ? 0.4 : 0.5;

            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: type === 'deal' ? -Math.random() * 0.5 - 0.1
                    : type === 'rise' ? Math.random() * 0.5 + 0.1
                        : (Math.random() - 0.5) * 0.2,
                radius: Math.random() * 3 + 2,
                type,
                alpha: Math.random() * alphaRange + baseAlpha,
                pulse: Math.random() * Math.PI * 2,
                pulseSpeed: Math.random() * 0.02 + 0.01,
            });
        }

        particlesRef.current = particles;
    }, [particleCount, isDark]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = canvas;
        const particles = particlesRef.current;
        const mouse = mouseRef.current;
        const colors = getColors();

        // Clear canvas with theme-appropriate color
        ctx.fillStyle = colors.clearColor;
        ctx.fillRect(0, 0, width, height);

        // Connection line opacity
        const connectionOpacityBase = isDark ? 0.15 : 0.25;

        // Draw connections between nearby particles
        particles.forEach((p1, i) => {
            particles.slice(i + 1).forEach(p2 => {
                const dx = p1.x - p2.x;
                const dy = p1.y - p2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 120) {
                    const opacity = (1 - distance / 120) * connectionOpacityBase;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(${colors.connection.r}, ${colors.connection.g}, ${colors.connection.b}, ${opacity})`;
                    ctx.lineWidth = isDark ? 0.5 : 1;
                    ctx.stroke();
                }
            });

            // Mouse interaction - draw connections to cursor
            if (interactive && mouse.active) {
                const dx = p1.x - mouse.x;
                const dy = p1.y - mouse.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 180) {
                    const opacity = (1 - distance / 180) * 0.4;
                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(mouse.x, mouse.y);
                    ctx.strokeStyle = `rgba(${colors.neutral.r}, ${colors.neutral.g}, ${colors.neutral.b}, ${opacity})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        });

        // Update and draw particles
        particles.forEach(p => {
            // Update pulse
            p.pulse += p.pulseSpeed;
            const pulseFactor = 1 + Math.sin(p.pulse) * 0.3;

            // Mouse repulsion/attraction
            if (interactive && mouse.active) {
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 150 && distance > 0) {
                    const force = (150 - distance) / 150;
                    const angle = Math.atan2(dy, dx);
                    // Deals are attracted to mouse, rises repelled
                    const direction = p.type === 'deal' ? -1 : p.type === 'rise' ? 1 : 0;
                    p.vx += Math.cos(angle) * force * 0.05 * direction;
                    p.vy += Math.sin(angle) * force * 0.05 * direction;
                }
            }

            // Apply velocity with damping
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.99;
            p.vy *= 0.99;

            // Restore base velocity for type-specific movement
            if (p.type === 'deal') p.vy += -0.002;
            if (p.type === 'rise') p.vy += 0.002;

            // Wrap around edges
            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            // Get color based on type
            const color = p.type === 'deal' ? colors.deal
                : p.type === 'rise' ? colors.rise
                    : colors.neutral;

            // Draw glow - larger and more visible in light mode
            const glowMultiplier = isDark ? 3 : 4;
            const gradient = ctx.createRadialGradient(
                p.x, p.y, 0,
                p.x, p.y, p.radius * glowMultiplier * pulseFactor
            );
            gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${p.alpha * 0.8})`);
            gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${p.alpha * 0.4})`);
            gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * glowMultiplier * pulseFactor, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Draw core - more solid in light mode
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius * pulseFactor, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${Math.min(1, p.alpha + 0.5)})`;
            ctx.fill();
        });

        // Draw mouse glow when active
        if (interactive && mouse.active) {
            const gradient = ctx.createRadialGradient(
                mouse.x, mouse.y, 0,
                mouse.x, mouse.y, 100
            );
            gradient.addColorStop(0, `rgba(${colors.mouseGlow.r}, ${colors.mouseGlow.g}, ${colors.mouseGlow.b}, 0.2)`);
            gradient.addColorStop(0.5, `rgba(${colors.mouseGlow.r}, ${colors.mouseGlow.g}, ${colors.mouseGlow.b}, 0.05)`);
            gradient.addColorStop(1, `rgba(${colors.mouseGlow.r}, ${colors.mouseGlow.g}, ${colors.mouseGlow.b}, 0)`);

            ctx.beginPath();
            ctx.arc(mouse.x, mouse.y, 100, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        animationRef.current = requestAnimationFrame(draw);
    }, [getColors, interactive, isDark]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleResize = () => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;
            initParticles(rect.width, rect.height);
        };

        const handleMouseMove = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            mouseRef.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                active: true,
            };
        };

        const handleMouseLeave = () => {
            mouseRef.current.active = false;
        };

        handleResize();
        window.addEventListener('resize', handleResize);

        if (interactive) {
            canvas.addEventListener('mousemove', handleMouseMove);
            canvas.addEventListener('mouseleave', handleMouseLeave);
        }

        // Start animation
        draw();

        return () => {
            window.removeEventListener('resize', handleResize);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseleave', handleMouseLeave);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [draw, initParticles, interactive]);

    // Re-init particles when theme changes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas && mounted) {
            initParticles(canvas.width, canvas.height);
        }
    }, [isDark, initParticles, mounted]);

    if (!mounted) return null;

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full pointer-events-auto ${className}`}
            style={{
                background: 'transparent',
            }}
        />
    );
}

export default PriceParticles;
