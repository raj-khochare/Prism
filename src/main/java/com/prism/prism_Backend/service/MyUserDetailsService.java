package com.prism.prism_Backend.service;

import com.prism.prism_Backend.domain.entity.AppUser;
import com.prism.prism_Backend.repository.spec.AppUserRepository;

import com.prism.prism_Backend.security.UserPrincipal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class MyUserDetailsService implements UserDetailsService {

    private final AppUserRepository userRepo;
    public MyUserDetailsService(AppUserRepository userRepo) {
        this.userRepo = userRepo;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        AppUser user = userRepo.findByUsername(username)
            .orElseThrow(() ->
                    new UsernameNotFoundException("User not found"));

        return new UserPrincipal(user);
    }
}
